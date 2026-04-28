import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

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

  // Check if user is admin
  if (sessionUser.role !== 'admin') {
    return NextResponse.json({ error: "Only admins can create contacts" }, { status: 403 });
  }

  const body = await request.json();
  const { firstName, lastName, phone, title, department, accountId, username, email, password, role } = body;

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "First name and last name are required" }, { status: 400 });
  }

  if (!username || !email || !password) {
    return NextResponse.json({ error: "Username, email, and password are required" }, { status: 400 });
  }

  if (!accountId) {
    return NextResponse.json({ error: "Account is required" }, { status: 400 });
  }

  // 1. Hash the password and insert into users table
  const hashedPassword = await bcrypt.hash(password, 10);

  const { data: newUser, error: userError } = await supabaseAdmin
    .from("users")
    .insert({
      username: username.trim(),
      email: email.trim(),
      password: hashedPassword,
      role: role || 'submittercase',
    })
    .select("id")
    .single();

  if (userError) {
    console.error("User insert error:", userError);
    return NextResponse.json({ error: userError.message || "Failed to create user" }, { status: 500 });
  }

  const userId = newUser.id;

  // 2. Fetch account to get account_sf_id for Salesforce integration
  const { data: account } = await supabaseAdmin
    .from("account")
    .select("id, account_sf_id")
    .eq("id", accountId)
    .single();

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // 3. Insert into contact table first (without SF ID)
  const { data: newContact, error: insertError } = await supabaseAdmin
    .from("contact")
    .insert({
      contact_sf_id: null,
      account_id: accountId,
      user_id: userId,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      title: title || null,
      department: department || null,
      phone: phone || null,
      password: password || null,
    })
    .select("id, contact_sf_id, account_id, user_id, firstName, lastName, fullName, title, department, phone, created_at")
    .single();

  if (insertError) {
    console.error("Supabase insert error:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 4. If Salesforce is enabled, sync to Salesforce
  const { data: settings } = await supabaseAdmin
    .from("settings")
    .select("salesforce_enabled, client_id, client_secret, base_url")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sfEnabled = settings?.salesforce_enabled === true;

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
          // Don't fail the request, just log the error
        } else {
          const { access_token } = await tokenRes.json();

          // Create Contact in Salesforce using custom Apex REST endpoint
          const sfContactPayload: Record<string, any> = {
            firstName: firstName,
            lastName: lastName,
            accountId: account.account_sf_id || "",
            password: password,
          };
          if (phone) sfContactPayload.phone = phone;
          if (email) sfContactPayload.email = email;
          if (title) sfContactPayload.title = title;
          if (department) sfContactPayload.department = department;

          const sfCreateRes = await fetch(
            `${instanceUrl}/services/apexrest/portal/contact`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(sfContactPayload),
            }
          );

          if (!sfCreateRes.ok) {
            const errText = await sfCreateRes.text();
            // Log error to error_log table
            await supabaseAdmin.from("error_log").insert({
              error_type: "SALESFORCE_CONTACT_CREATE",
              error_message: "Failed to create contact in Salesforce",
              error_details: `${errText} | Payload: ${JSON.stringify(sfContactPayload)}`,
              user_id: sessionUser.id,
            });
            // Don't fail the request, just log the error
          } else {
            const sfResponse = await sfCreateRes.json();

            // Parse custom response structure
            if (sfResponse.status_code === 201 && sfResponse.data && Array.isArray(sfResponse.data) && sfResponse.data.length > 0) {
              const contactId = sfResponse.data[0].contactId;

              // Update Supabase contact with Salesforce ID
              if (contactId) {
                const { error: updateError } = await supabaseAdmin
                  .from("contact")
                  .update({
                    contact_sf_id: contactId,
                  })
                  .eq("id", newContact.id);

                if (updateError) {
                  await supabaseAdmin.from("error_log").insert({
                    error_type: "SUPABASE_UPDATE",
                    error_message: "Failed to update contact with Salesforce data",
                    error_details: updateError.message,
                    user_id: sessionUser.id,
                  });
                } else {
                  await supabaseAdmin.from("error_log").insert({
                    error_type: "SALESFORCE_SYNC_SUCCESS",
                    error_message: "Successfully synced contact to Salesforce",
                    error_details: `Updated contact with SF ID: ${contactId}`,
                    user_id: sessionUser.id,
                  });
                }
              }
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

  // Fetch final contact data
  const { data: finalContact } = await supabaseAdmin
    .from("contact")
    .select("id, contact_sf_id, account_id, user_id, firstName, lastName, fullName, title, department, phone, created_at")
    .eq("id", newContact.id)
    .maybeSingle();

  return NextResponse.json({ contact: finalContact || newContact }, { status: 201 });
}
