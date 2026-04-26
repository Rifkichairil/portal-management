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
  const { firstName, lastName, phone, accountId, username, email, password, role } = body;

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "First name and last name are required" }, { status: 400 });
  }

  if (!username || !email || !password) {
    return NextResponse.json({ error: "Username, email, and password are required" }, { status: 400 });
  }

  if (!accountId) {
    return NextResponse.json({ error: "Account is required" }, { status: 400 });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Insert into users table first
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

  // Fetch account to get account_sf_id for Salesforce integration
  const { data: account } = await supabaseAdmin
    .from("account")
    .select("id, account_sf_id")
    .eq("id", accountId)
    .single();

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Fetch current settings to determine whether SF integration is enabled
  const { data: settings } = await supabaseAdmin
    .from("settings")
    .select("salesforce_enabled, client_id, client_secret")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sfEnabled = settings?.salesforce_enabled === true;

  let contactSfId: string | null = null;

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

    // 2. Create Contact in Salesforce
    const sfContactPayload: Record<string, string> = {
      FirstName: firstName,
      LastName: lastName,
      AccountId: account.account_sf_id || "",
    };
    if (phone) sfContactPayload.Phone = phone;

    const sfCreateRes = await fetch(
      `${instance_url}/services/data/v59.0/sobjects/Contact`,
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
      console.error("SF create contact error:", errText);
      return NextResponse.json(
        { error: "Failed to create contact in Salesforce." },
        { status: 502 }
      );
    }

    const sfCreated = await sfCreateRes.json();
    contactSfId = sfCreated.id as string;
  }

  // Insert into Supabase
  const { data: newContact, error: insertError } = await supabaseAdmin
    .from("contact")
    .insert({
      contact_sf_id: contactSfId,
      account_id: accountId,
      user_id: userId,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      phone: phone || null,
    })
    .select("id, contact_sf_id, account_id, user_id, firstName, lastName, fullName, phone, created_at")
    .single();

  if (insertError) {
    console.error("Supabase insert error:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ contact: newContact }, { status: 201 });
}
