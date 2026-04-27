import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Generate a random case number like CAS-00123456 */
function generateRandomCaseNumber(): string {
  const num = Math.floor(Math.random() * 9_000_000) + 1_000_000;
  return `CAS-${num}`;
}

export async function POST(request: NextRequest) {
  // Authenticate user via session_token cookie
  const token = request.cookies.get("session_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = await verifyToken(token);
  if (!sessionUser) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  // Fetch full user including contact_sf_id
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id, role, contact:contact!contact_user_id_fkey(contact_sf_id)")
    .eq("id", sessionUser.id)
    .maybeSingle();

  // Get contact_sf_id from the related contact record
  const { data: contactData } = await supabaseAdmin
    .from("contact")
    .select("contact_sf_id")
    .eq("user_id", sessionUser.id)
    .maybeSingle();

  const contactSfId = contactData?.contact_sf_id || null;

  const body = await request.json();
  const { subject, description, images } = body;

  if (!subject) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }

  // Fetch current settings to determine whether SF integration is enabled
  const { data: settings } = await supabaseAdmin
    .from("settings")
    .select("salesforce_enabled, client_id, client_secret, base_url")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sfEnabled = settings?.salesforce_enabled === true;

  // 1. If Salesforce is enabled, create case in Salesforce first
  let sfCaseId = null;
  let sfCaseNumber = null;

  if (sfEnabled) {
    const sfClientId = settings?.client_id;
    const sfClientSecret = settings?.client_secret;
    const sfBaseUrl = settings?.base_url;

    if (!sfClientId || !sfClientSecret || !sfBaseUrl) {
      // Log error but don't fail the request
      await supabaseAdmin.from("error_log").insert({
        error_type: "SALESFORCE_CONFIG",
        error_message: "Salesforce credentials not configured",
        error_details: "Missing client_id, client_secret, or base_url",
        user_id: sessionUser.id,
      });
    } else {
      try {
        // Get OAuth token from Salesforce
        const instanceUrl = sfBaseUrl.includes('/services/oauth2/token')
          ? sfBaseUrl.replace('/services/oauth2/token', '')
          : sfBaseUrl;

        await supabaseAdmin.from("error_log").insert({
          error_type: "SALESFORCE_SYNC_INFO",
          error_message: "Starting Salesforce sync",
          error_details: "Attempting to create case in Salesforce first",
          user_id: sessionUser.id,
        });

        const tokenRes = await fetch(
          `${instanceUrl}/services/oauth2/token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "client_credentials",
              client_id: sfClientId,
              client_secret: sfClientSecret,
            }),
          }
        );

        if (!tokenRes.ok) {
          const errText = await tokenRes.text();
          // Log error to error_log table
          await supabaseAdmin.from("error_log").insert({
            error_type: "SALESFORCE_AUTH",
            error_message: "Failed to authenticate with Salesforce",
            error_details: errText,
            user_id: sessionUser.id,
          });
          // Don't fail the request, just log the error
        } else {
          const { access_token } = await tokenRes.json();

          await supabaseAdmin.from("error_log").insert({
            error_type: "SALESFORCE_AUTH_SUCCESS",
            error_message: "Successfully authenticated with Salesforce",
            error_details: "Got access token",
            user_id: sessionUser.id,
          });

          // Create Case in Salesforce using custom Apex REST endpoint
          const sfCasePayload: Record<string, any> = {
            subject: subject,
            description: description || "",
            origin: "Web",
            images: images || [],
          };

          const sfCreateRes = await fetch(
            `${instanceUrl}/services/apexrest/portal/case`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(sfCasePayload),
            }
          );

          if (!sfCreateRes.ok) {
            const errText = await sfCreateRes.text();
            // Log error to error_log table
            await supabaseAdmin.from("error_log").insert({
              error_type: "SALESFORCE_CASE_CREATE",
              error_message: "Failed to create case in Salesforce",
              error_details: `${errText} | Payload: ${JSON.stringify(sfCasePayload)}`,
              user_id: sessionUser.id,
            });
            // Don't fail the request, just log the error
          } else {
            const sfResponse = await sfCreateRes.json();

            await supabaseAdmin.from("error_log").insert({
              error_type: "SALESFORCE_RESPONSE",
              error_message: "Received response from Salesforce",
              error_details: JSON.stringify(sfResponse),
              user_id: sessionUser.id,
            });

            // Parse custom response structure
            if (sfResponse.status_code === 200 && sfResponse.data && Array.isArray(sfResponse.data) && sfResponse.data.length > 0) {
              sfCaseId = sfResponse.data[0].caseId;
              sfCaseNumber = sfResponse.data[0].caseNumber;

              await supabaseAdmin.from("error_log").insert({
                error_type: "SALESFORCE_SYNC_SUCCESS",
                error_message: "Successfully created case in Salesforce",
                error_details: `SF ID: ${sfCaseId}, SF Case Number: ${sfCaseNumber}`,
                user_id: sessionUser.id,
              });
            } else {
              await supabaseAdmin.from("error_log").insert({
                error_type: "SALESFORCE_RESPONSE",
                error_message: "Unexpected response structure from Salesforce",
                error_details: JSON.stringify(sfResponse),
                user_id: sessionUser.id,
              });
            }
          }
        }
      } catch (error) {
        // Log error to error_log table
        await supabaseAdmin.from("error_log").insert({
          error_type: "SALESFORCE_SYNC",
          error_message: "Salesforce sync error",
          error_details: error instanceof Error ? error.message : String(error),
          user_id: sessionUser.id,
        });
        // Don't fail the request, just log the error
      }
    }
  }

  // 2. Insert into Supabase with Salesforce data if available
  const caseNumber = sfCaseNumber || generateRandomCaseNumber();

  const { data: newCase, error: insertError } = await supabaseAdmin
    .from("case")
    .insert({
      case_sf_id: sfCaseId,
      contact_sf_id: contactSfId,
      caseNumber: caseNumber,
      subject,
      status: "New",
    })
    .select("id, caseNumber, case_sf_id, status, created_at")
    .single();

  if (insertError) {
    console.error("Supabase insert error:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: finalCase } = await supabaseAdmin
    .from("case")
    .select("id, caseNumber, case_sf_id, status, created_at")
    .eq("id", newCase.id)
    .maybeSingle();

  return NextResponse.json({ case: finalCase || newCase }, { status: 201 });
}
