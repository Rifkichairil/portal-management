import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Error codes:
// SFCP-001: Unauthorized - no session token
// SFCP-002: Forbidden - not admin/manager
// SFCP-003: Missing accountId
// SFCP-004: Salesforce credentials not configured
// SFCP-005: Failed to authenticate with Salesforce (OAuth)
// SFCP-006: Failed to fetch contacts from Salesforce
// SFCP-007: Internal server error

export async function GET(request: NextRequest) {
  // Authenticate user via session_token cookie
  const token = request.cookies.get("session_token")?.value;
  if (!token) {
    return NextResponse.json({
      error: "Unauthorized",
      code: "SFCP-001",
      message: "Silakan login terlebih dahulu.",
    }, { status: 401 });
  }

  const sessionUser = await verifyToken(token);
  if (!sessionUser) {
    return NextResponse.json({
      error: "Invalid or expired session",
      code: "SFCP-001",
      message: "Sesi telah berakhir. Silakan login ulang.",
    }, { status: 401 });
  }

  // Only admins and managers can fetch contacts from Salesforce
  if (sessionUser.role !== "admin" && sessionUser.role !== "manager") {
    return NextResponse.json({
      error: "Forbidden: Admin or Manager access required",
      code: "SFCP-002",
      message: "Hanya admin dan manager yang dapat mengambil data dari Salesforce.",
    }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");

  if (!accountId) {
    return NextResponse.json({
      error: "Salesforce Account ID is required",
      code: "SFCP-003",
      message: "Silakan masukkan Salesforce Account ID.",
    }, { status: 400 });
  }

  // Validate Salesforce ID format (15 or 18 characters, alphanumeric)
  const sfIdRegex = /^[a-zA-Z0-9]{15,18}$/;
  if (!sfIdRegex.test(accountId)) {
    return NextResponse.json({
      error: "Invalid Salesforce Account ID format",
      code: "SFCP-003",
      message: "Format Salesforce Account ID tidak valid. Harus 15-18 karakter alfanumerik.",
    }, { status: 400 });
  }

  // Fetch settings
  const { data: settings } = await supabaseAdmin
    .from("settings")
    .select("client_id, client_secret, base_url")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!settings?.client_id || !settings?.client_secret || !settings?.base_url) {
    console.error("[Salesforce Contact Password] Salesforce credentials not configured");
    return NextResponse.json({
      error: "Salesforce credentials not configured",
      code: "SFCP-004",
      message: "Konfigurasi Salesforce belum lengkap. Hubungi administrator.",
    }, { status: 500 });
  }

  try {
    // Get OAuth token from Salesforce
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
      console.error("[Salesforce Contact Password] Failed to get Salesforce token:", errText);
      return NextResponse.json({
        error: "Failed to authenticate with Salesforce",
        code: "SFCP-005",
        message: "Gagal terhubung ke Salesforce. Cek kembali konfigurasi kredensial.",
        details: errText,
      }, { status: 500 });
    }

    const { access_token } = await tokenRes.json();

    // Fetch contacts with passwords from Salesforce
    const dataUrl = `${instanceUrl}/services/apexrest/portal/contact/password?accountId=${accountId}`;
    console.log("[Salesforce Contact Password] Fetching contacts from:", dataUrl);

    const dataRes = await fetch(dataUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!dataRes.ok) {
      const errText = await dataRes.text();
      console.error("[Salesforce Contact Password] Failed to fetch contacts:", errText);

      let sfErrorMessage = errText;
      try {
        const sfError = JSON.parse(errText);
        sfErrorMessage = sfError.message || sfError.error || JSON.stringify(sfError);
      } catch {}

      return NextResponse.json({
        error: `Salesforce API error: ${dataRes.status}`,
        code: "SFCP-006",
        message: `Salesforce mengembalikan error (${dataRes.status}). ${dataRes.status === 404 ? "Data tidak ditemukan." : sfErrorMessage}`,
        details: sfErrorMessage,
      }, { status: 500 });
    }

    const sfResponse = await dataRes.json();
    console.log("[Salesforce Contact Password] Successfully fetched contacts:",
      sfResponse?.data?.length ? `${sfResponse.data.length} contacts` : "empty");

    return NextResponse.json(sfResponse, { status: 200 });
  } catch (error) {
    console.error("[Salesforce Contact Password] Error fetching contacts:", error);
    return NextResponse.json({
      error: "Internal server error",
      code: "SFCP-007",
      message: "Terjadi kesalahan internal server. Silakan coba lagi.",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
