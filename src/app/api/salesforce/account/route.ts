import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Error codes:
// SF-001: Unauthorized - no session token
// SF-002: Forbidden - not admin
// SF-003: Missing Salesforce Account ID
// SF-004: Salesforce credentials not configured
// SF-005: Failed to authenticate with Salesforce (OAuth)
// SF-006: Failed to fetch account from Salesforce (Apex endpoint)
// SF-007: Account not found in Salesforce response
// SF-008: Internal server error

export async function GET(request: NextRequest) {
  // Authenticate user via session_token cookie
  const token = request.cookies.get("session_token")?.value;
  if (!token) {
    return NextResponse.json({
      error: "Unauthorized",
      code: "SF-001",
      message: "Silakan login terlebih dahulu.",
    }, { status: 401 });
  }

  const sessionUser = await verifyToken(token);
  if (!sessionUser) {
    return NextResponse.json({
      error: "Invalid or expired session",
      code: "SF-001",
      message: "Sesi telah berakhir. Silakan login ulang.",
    }, { status: 401 });
  }

  // Only admins can fetch accounts from Salesforce
  if (sessionUser.role !== "admin") {
    return NextResponse.json({
      error: "Forbidden: Admin access required",
      code: "SF-002",
      message: "Hanya admin yang dapat melakukan sinkronasi dari Salesforce.",
    }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const sfAccountId = searchParams.get("id");

  if (!sfAccountId) {
    return NextResponse.json({
      error: "Salesforce Account ID is required",
      code: "SF-003",
      message: "Silakan masukkan Salesforce Account ID.",
    }, { status: 400 });
  }

  // Validate Salesforce ID format (15 or 18 characters, alphanumeric)
  const sfIdRegex = /^[a-zA-Z0-9]{15,18}$/;
  if (!sfIdRegex.test(sfAccountId)) {
    return NextResponse.json({
      error: "Invalid Salesforce Account ID format",
      code: "SF-003",
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
    console.error("[Salesforce Account] Salesforce credentials not configured");
    return NextResponse.json({
      error: "Salesforce credentials not configured",
      code: "SF-004",
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
      console.error("[Salesforce Account] Failed to get Salesforce token:", errText);
      return NextResponse.json({
        error: "Failed to authenticate with Salesforce",
        code: "SF-005",
        message: "Gagal terhubung ke Salesforce. Cek kembali konfigurasi kredensial.",
        details: errText,
      }, { status: 500 });
    }

    const { access_token } = await tokenRes.json();

    // Fetch account from Salesforce
    const dataUrl = `${instanceUrl}/services/apexrest/portal/account?id=${sfAccountId}`;
    console.log("[Salesforce Account] Fetching account from:", dataUrl);

    const dataRes = await fetch(dataUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!dataRes.ok) {
      const errText = await dataRes.text();
      console.error("[Salesforce Account] Failed to fetch account from Salesforce:", errText);

      // Try to parse Salesforce error
      let sfErrorMessage = errText;
      try {
        const sfError = JSON.parse(errText);
        sfErrorMessage = sfError.message || sfError.error || JSON.stringify(sfError);
      } catch {}

      return NextResponse.json({
        error: `Salesforce API error: ${dataRes.status}`,
        code: "SF-006",
        message: `Salesforce mengembalikan error (${dataRes.status}). ${dataRes.status === 404 ? "Account ID tidak ditemukan di Salesforce." : sfErrorMessage}`,
        details: sfErrorMessage,
      }, { status: 500 });
    }

    const sfResponse = await dataRes.json();
    console.log("[Salesforce Account] Successfully fetched account:", sfResponse);

    // Extract account data from Salesforce response
    // Expected response: { status_code: 200, data: [{ accountId, name, phone, ... }] }
    if (sfResponse.status_code === 200 && sfResponse.data && Array.isArray(sfResponse.data)) {
      if (sfResponse.data.length === 0) {
        return NextResponse.json({
          error: "Account not found",
          code: "SF-007",
          message: `Account dengan ID "${sfAccountId}" tidak ditemukan di Salesforce.`,
        }, { status: 404 });
      }
      return NextResponse.json({ data: sfResponse.data }, { status: 200 });
    }

    // Fallback if response structure is different
    if (sfResponse && typeof sfResponse === "object" && Object.keys(sfResponse).length > 0) {
      return NextResponse.json({ data: sfResponse }, { status: 200 });
    }

    return NextResponse.json({
      error: "Account not found",
      code: "SF-007",
      message: `Data tidak ditemukan untuk Account ID "${sfAccountId}".`,
    }, { status: 404 });
  } catch (error) {
    console.error("[Salesforce Account] Error fetching account:", error);
    return NextResponse.json({
      error: "Internal server error",
      code: "SF-008",
      message: "Terjadi kesalahan internal server. Silakan coba lagi.",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
