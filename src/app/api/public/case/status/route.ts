import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { case_sf_id, status } = body;

  if (!case_sf_id) {
    return NextResponse.json({ error: "case_sf_id is required" }, { status: 400 });
  }

  if (!status) {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  const { data: settings } = await supabaseAdmin
    .from("settings")
    .select("client_id, client_secret, base_url")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!settings?.client_id || !settings?.client_secret || !settings?.base_url) {
    return NextResponse.json({ error: "Salesforce credentials not configured" }, { status: 500 });
  }

  try {
    const instanceUrl = settings.base_url.includes("/services/oauth2/token")
      ? settings.base_url.replace("/services/oauth2/token", "")
      : settings.base_url;

    const tokenRes = await fetch(`${instanceUrl}/services/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: settings.client_id,
        client_secret: settings.client_secret,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return NextResponse.json(
        { error: "Failed to authenticate with Salesforce", details: errText },
        { status: 500 }
      );
    }

    const { access_token } = await tokenRes.json();

    const versionsRes = await fetch(`${instanceUrl}/services/data`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!versionsRes.ok) {
      const errText = await versionsRes.text();
      return NextResponse.json(
        { error: "Failed to get Salesforce API versions", details: errText },
        { status: 500 }
      );
    }

    const versions = await versionsRes.json();
    if (!Array.isArray(versions) || versions.length === 0) {
      return NextResponse.json(
        { error: "No Salesforce API versions available" },
        { status: 500 }
      );
    }

    const latestVersion = versions[versions.length - 1];
    const sobjectPath = latestVersion?.url;

    if (!sobjectPath) {
      return NextResponse.json(
        { error: "Invalid Salesforce API version response" },
        { status: 500 }
      );
    }

    const sfRes = await fetch(
      `${instanceUrl}${sobjectPath}/sobjects/Case/${case_sf_id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ Status: status }),
      }
    );

    if (!sfRes.ok) {
      const errText = await sfRes.text();
      return NextResponse.json(
        { error: "Failed to update case status in Salesforce", details: errText },
        { status: 500 }
      );
    }

    const salesforceResponse = sfRes.status === 204
      ? { success: true, status: 204 }
      : await sfRes.json();

    const { data: updatedCase, error: updateError } = await supabaseAdmin
      .from("case")
      .update({ status })
      .eq("case_sf_id", case_sf_id)
      .select("id, caseNumber, case_sf_id, status, created_at")
      .maybeSingle();

    if (updateError) {
      return NextResponse.json(
        {
          error: "Salesforce updated but failed to sync local case status",
          details: updateError.message,
          salesforce: salesforceResponse,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Case status updated",
      salesforce: salesforceResponse,
      local_case: updatedCase,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
