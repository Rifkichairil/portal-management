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

  const body = await request.json();
  const { name, phone, email, website, billingStreet } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Fetch current settings to determine whether SF integration is enabled
  const { data: settings } = await supabaseAdmin
    .from("settings")
    .select("salesforce_enabled, client_id, client_secret")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sfEnabled = settings?.salesforce_enabled === true;

  let accountSfId: string | null = null;

  if (sfEnabled) {
    // --- Salesforce flow ---
    const sfClientId = settings?.client_id;
    const sfClientSecret = settings?.client_secret;

    if (!sfClientId || !sfClientSecret) {
      return NextResponse.json(
        { error: "Salesforce credentials not configured." },
        { status: 500 }
      );
    }

    // 1. Get OAuth token from Salesforce
    const tokenRes = await fetch(
      "https://login.salesforce.com/services/oauth2/token",
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
      console.error("SF token error:", errText);
      return NextResponse.json(
        { error: "Failed to authenticate with Salesforce." },
        { status: 502 }
      );
    }

    const { access_token, instance_url } = await tokenRes.json();

    // 2. Create Account in Salesforce
    const sfAccountPayload: Record<string, string> = {
      Name: name,
    };
    if (phone) sfAccountPayload.Phone = phone;
    if (billingStreet) sfAccountPayload.BillingStreet = billingStreet;
    if (website) sfAccountPayload.Website = website;

    const sfCreateRes = await fetch(
      `${instance_url}/services/data/v59.0/sobjects/Account`,
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
      console.error("SF create account error:", errText);
      return NextResponse.json(
        { error: "Failed to create account in Salesforce." },
        { status: 502 }
      );
    }

    const sfCreated = await sfCreateRes.json();
    accountSfId = sfCreated.id as string;
  }

  // Insert into Supabase
  const { data: newAccount, error: insertError } = await supabaseAdmin
    .from("account")
    .insert({
      account_sf_id: accountSfId,
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

  return NextResponse.json({ account: newAccount }, { status: 201 });
}
