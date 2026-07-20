import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  // Authenticate user
  const token = request.cookies.get("session_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = await verifyToken(token);
  if (!sessionUser) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  const body = await request.json();
  const { caseId } = body; // Supabase case ID (uuid)

  if (!caseId) {
    return NextResponse.json({ error: "caseId is required" }, { status: 400 });
  }

  // Fetch the case from Supabase
  const { data: caseRow, error: caseError } = await supabaseAdmin
    .from("case")
    .select("id, case_sf_id, caseNumber, status")
    .eq("id", caseId)
    .maybeSingle();

  if (caseError || !caseRow) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  if (caseRow.status === "Closed") {
    return NextResponse.json({ error: "Case is already closed" }, { status: 400 });
  }

  // Update status in Supabase
  const { error: updateError } = await supabaseAdmin
    .from("case")
    .update({ status: "Closed" })
    .eq("id", caseId);

  if (updateError) {
    console.error("Supabase update error:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Try Salesforce sync if case_sf_id exists
  const sfEnabled = true; // Always attempt if case_sf_id is present
  let sfResult: { success: boolean; error?: string } = { success: false };

  if (caseRow.case_sf_id) {
    try {
      // Fetch Salesforce credentials from settings
      const { data: settings } = await supabaseAdmin
        .from("settings")
        .select("client_id, client_secret, base_url")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (settings?.client_id && settings?.client_secret && settings?.base_url) {
        const instanceUrl = settings.base_url.includes("/services/oauth2/token")
          ? settings.base_url.replace("/services/oauth2/token", "")
          : settings.base_url;

        // Get OAuth token
        const tokenRes = await fetch(
          `${instanceUrl}/services/oauth2/token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "client_credentials",
              client_id: settings.client_id,
              client_secret: settings.client_secret,
            }),
          }
        );

        if (!tokenRes.ok) {
          const errText = await tokenRes.text();
          console.error("Salesforce auth error:", errText);
          sfResult = { success: false, error: "Failed to authenticate with Salesforce" };
        } else {
          const { access_token } = await tokenRes.json();

          // Call Salesforce close endpoint
          const sfCloseRes = await fetch(
            `${instanceUrl}/services/apexrest/portal/case/close`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ caseId: caseRow.case_sf_id }),
            }
          );

          if (sfCloseRes.ok) {
            sfResult = { success: true };
          } else {
            const errText = await sfCloseRes.text();
            console.error("Salesforce close error:", errText);
            sfResult = { success: false, error: "Failed to close case in Salesforce" };
          }
        }
      } else {
        sfResult = { success: false, error: "Salesforce credentials not configured" };
      }
    } catch (err) {
      console.error("Salesforce sync error:", err);
      sfResult = { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  return NextResponse.json({
    success: true,
    caseNumber: caseRow.caseNumber,
    sfSynced: sfResult.success,
    sfError: sfResult.error || null,
  });
}
