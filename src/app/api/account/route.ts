import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

  // Only admins can create accounts
  if (sessionUser.role !== 'admin') {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { name, phone, email, website, billingStreet } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Fetch current settings to determine whether SF integration is enabled
  const { data: settings } = await supabaseAdmin
    .from("settings")
    .select("salesforce_enabled, client_id, client_secret, base_url")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sfEnabled = settings?.salesforce_enabled === true;

  // 1. Insert into Supabase first (with null account_sf_id)
  const { data: newAccount, error: insertError } = await supabaseAdmin
    .from("account")
    .insert({
      account_sf_id: null,
      name,
      phone: phone || null,
      email: email || null,
      website: website || null,
      billingStreet: billingStreet || null,
    })
    .select("id, account_sf_id, name, phone, email, website, billingStreet, created_at")
    .single();

  if (insertError) {
    console.error("Supabase insert error:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 2. If Salesforce is enabled, sync to Salesforce
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
          // Delete the record from Supabase since SF sync failed
          await supabaseAdmin.from("account").delete().eq("id", newAccount.id);
          return NextResponse.json({ error: "Failed to authenticate with Salesforce" }, { status: 500 });
        } else {
          const { access_token } = await tokenRes.json();

          // Create Account in Salesforce using custom Apex REST endpoint
          const sfAccountPayload: Record<string, any> = {
            name: name,
          };
          if (phone) sfAccountPayload.phone = phone;
          if (email) sfAccountPayload.email = email;
          if (website) sfAccountPayload.website = website;
          if (billingStreet) sfAccountPayload.billingStreet = billingStreet;

          const sfCreateRes = await fetch(
            `${instanceUrl}/services/apexrest/portal/account`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(sfAccountPayload),
            }
          );

          if (!sfCreateRes.ok) {
            const errText = await sfCreateRes.text();
            // Log error to error_log table
            await supabaseAdmin.from("error_log").insert({
              error_type: "SALESFORCE_ACCOUNT_CREATE",
              error_message: "Failed to create account in Salesforce",
              error_details: `${errText} | Payload: ${JSON.stringify(sfAccountPayload)}`,
              user_id: sessionUser.id,
            });
            // Delete the record from Supabase since SF sync failed
            await supabaseAdmin.from("account").delete().eq("id", newAccount.id);
            return NextResponse.json({ error: "Failed to create account in Salesforce" }, { status: 500 });
          } else {
            const sfResponse = await sfCreateRes.json();

            // Parse custom response structure
            if (sfResponse.status_code === 201 && sfResponse.data && Array.isArray(sfResponse.data) && sfResponse.data.length > 0) {
              const accountId = sfResponse.data[0].accountId;

              // Update Supabase account with Salesforce ID
              if (accountId) {
                const { error: updateError } = await supabaseAdmin
                  .from("account")
                  .update({
                    account_sf_id: accountId,
                  })
                  .eq("id", newAccount.id);

                if (updateError) {
                  await supabaseAdmin.from("error_log").insert({
                    error_type: "SUPABASE_UPDATE",
                    error_message: "Failed to update account with Salesforce data",
                    error_details: updateError.message,
                    user_id: sessionUser.id,
                  });
                } else {
                  await supabaseAdmin.from("error_log").insert({
                    error_type: "SALESFORCE_SYNC_SUCCESS",
                    error_message: "Successfully synced account to Salesforce",
                    error_details: `Updated account with SF ID: ${accountId}`,
                    user_id: sessionUser.id,
                  });
                }
              }
            } else {
              await supabaseAdmin.from("error_log").insert({
                error_type: "SALESFORCE_RESPONSE",
                error_message: "Unexpected response structure from Salesforce",
                error_details: JSON.stringify(sfResponse),
                user_id: sessionUser.id,
              });
              // Delete the record from Supabase since SF response is invalid
              await supabaseAdmin.from("account").delete().eq("id", newAccount.id);
              return NextResponse.json({ error: "Unexpected response from Salesforce" }, { status: 500 });
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
        // Delete the record from Supabase since SF sync failed
        await supabaseAdmin.from("account").delete().eq("id", newAccount.id);
        return NextResponse.json({ error: "Salesforce sync error" }, { status: 500 });
      }
    }
  }

  // Fetch final account data
  const { data: finalAccount } = await supabaseAdmin
    .from("account")
    .select("id, account_sf_id, name, phone, email, website, billingStreet, created_at")
    .eq("id", newAccount.id)
    .maybeSingle();

  return NextResponse.json({ account: finalAccount || newAccount }, { status: 201 });
}
