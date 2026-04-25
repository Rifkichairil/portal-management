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
  const { subject, description } = body;

  if (!subject) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }

  // Fetch current settings to determine whether SF integration is enabled
  const { data: settings } = await supabaseAdmin
    .from("settings")
    .select("salesforce_enabled, client_id, client_secret")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sfEnabled = settings?.salesforce_enabled === true;

  let caseNumber: string;
  let caseSfId: string | null = null;

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

    // 2. Create Case in Salesforce
    const sfCasePayload: Record<string, string> = {
      Subject: subject,
      Description: description || "",
      Status: "New",
    };
    if (contactSfId) sfCasePayload.ContactId = contactSfId;

    const sfCreateRes = await fetch(
      `${instance_url}/services/data/v59.0/sobjects/Case`,
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
      console.error("SF create case error:", errText);
      return NextResponse.json(
        { error: "Failed to create case in Salesforce." },
        { status: 502 }
      );
    }

    const sfCreated = await sfCreateRes.json();
    caseSfId = sfCreated.id as string;

    // 3. Fetch the CaseNumber from Salesforce
    const sfFetchRes = await fetch(
      `${instance_url}/services/data/v59.0/sobjects/Case/${caseSfId}?fields=CaseNumber`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    if (sfFetchRes.ok) {
      const sfCase = await sfFetchRes.json();
      caseNumber = sfCase.CaseNumber as string;
    } else {
      caseNumber = caseSfId;
    }
  } else {
    // --- Direct Supabase flow ---
    caseNumber = generateRandomCaseNumber();
    caseSfId = null;
  }

  // Insert into Supabase
  const { data: newCase, error: insertError } = await supabaseAdmin
    .from("case")
    .insert({
      case_sf_id: caseSfId,
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

  return NextResponse.json({ case: newCase }, { status: 201 });
}
