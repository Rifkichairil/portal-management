import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@/lib/auth";
import { parsePgError } from "@/lib/supabase-error";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch cases from Salesforce by account + date range
// POST: Insert fetched cases into Supabase

export async function GET(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return unauthorized();

  const sessionUser = await verifyToken(token);
  if (!sessionUser) return unauthorized();
  if (sessionUser.role !== "admin") return forbidden();

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!accountId || !startDate || !endDate) {
    return NextResponse.json({
      error: "Missing required params", code: "SCS-003",
      message: "Account ID, start date, dan end date wajib diisi.",
    }, { status: 400 });
  }

  const sf = await getSfSettings();
  if (!sf) return sfNotConfigured();

  try {
    const accessToken = await getSfToken(sf);
    if (!accessToken) return NextResponse.json({ error: "SF auth failed", code: "SCS-005", message: "Gagal terhubung ke Salesforce." }, { status: 500 });

    const dataUrl = `${sf.instanceUrl}/services/apexrest/portal/case?accountId=${encodeURIComponent(accountId)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;

    const dataRes = await fetch(dataUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });

    if (!dataRes.ok) {
      const errText = await dataRes.text();
      return NextResponse.json({ error: "Failed to fetch cases", code: "SCS-006", message: `Salesforce error: ${errText}` }, { status: 500 });
    }

    const sfResponse = await dataRes.json();
    let cases: any[] = [];
    if (sfResponse.data && Array.isArray(sfResponse.data)) cases = sfResponse.data;
    else if (Array.isArray(sfResponse)) cases = sfResponse;

    // Debug: log field names from first case
    if (cases.length > 0) {
      console.log("[Sync Cases] Salesforce response fields:", Object.keys(cases[0]));
      console.log("[Sync Cases] First case sample:", JSON.stringify(cases[0], null, 2));
    }

    // Check duplicates against Supabase
    const sfIds = cases.map((c: any) => c.caseId).filter(Boolean);
    const { data: existingCases } = await supabaseAdmin
      .from("case")
      .select("case_sf_id")
      .in("case_sf_id", sfIds.length > 0 ? sfIds : ["__none__"]);

    const existingSfIds = new Set((existingCases || []).map((c: any) => c.case_sf_id));
    const newCases = cases.filter((c: any) => !existingSfIds.has(c.caseId));
    const skippedIds = cases.filter((c: any) => existingSfIds.has(c.caseId)).map((c: any) => ({ caseId: c.caseId, caseNumber: c.caseNumber }));

    return NextResponse.json({
      code: "SCS-OK",
      data: {
        total: cases.length,
        new: newCases.length,
        skipped: skippedIds.length,
        newCases,
        skippedCases: skippedIds,
      },
    });
  } catch (error) {
    console.error("[Sync Cases] Error:", error);
    return NextResponse.json({ error: "Internal error", code: "SCS-007", message: "Terjadi kesalahan server." }, { status: 500 });
  }
}

// POST: Bulk insert new cases into Supabase
export async function POST(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return unauthorized();
  const sessionUser = await verifyToken(token);
  if (!sessionUser) return unauthorized();
  if (sessionUser.role !== "admin") return forbidden();

  const body = await request.json();
  const { cases } = body;

  if (!Array.isArray(cases) || cases.length === 0) {
    return NextResponse.json({ error: "No cases to insert", code: "SCS-003", message: "Tidak ada case untuk diinsert." }, { status: 400 });
  }

  // Filter out duplicates again for safety
  const sfIds = cases.map((c: any) => c.caseId).filter(Boolean);
  const { data: existingCasesData } = await supabaseAdmin
    .from("case")
    .select("case_sf_id, description, resolution")
    .in("case_sf_id", sfIds.length > 0 ? sfIds : ["__none__"]);

  const existingSfIds = new Set((existingCasesData || []).map((c: any) => c.case_sf_id));
  const toInsert = cases.filter((c: any) => !existingSfIds.has(c.caseId));

  // Update existing cases that have null description/resolution
  if (existingCasesData && existingCasesData.length > 0) {
    for (const existing of existingCasesData) {
      if (existing.description !== null && existing.resolution !== null) continue;
      const sfCase = cases.find((c: any) => c.caseId === existing.case_sf_id);
      if (!sfCase) continue;
      const updateData: Record<string, any> = {};
      if (existing.description === null && sfCase.description) updateData.description = sfCase.description;
      if (existing.resolution === null && (sfCase.resolution || sfCase.resolved)) updateData.resolution = sfCase.resolution || sfCase.resolved || null;
      if (Object.keys(updateData).length > 0) {
        await supabaseAdmin.from("case").update(updateData).eq("case_sf_id", existing.case_sf_id);
      }
    }
  }

  if (toInsert.length === 0) {
    const updated = existingCasesData?.filter((c: any) => c.description === null || c.resolution === null).length || 0;
    return NextResponse.json({
      code: "SCS-OK",
      message: updated > 0 ? `Tidak ada case baru. ${updated} case yang sudah ada diupdate description/resolution-nya.` : "Semua case sudah ada di database.",
      inserted: 0,
      skipped: cases.length,
      updated,
    });
  }

  // Find which contact_sf_ids exist locally (foreign key constraint)
  const contactSfIds = [...new Set(toInsert.map((c: any) => c.submitterBy || c.contactId).filter(Boolean))];
  const { data: existingContacts } = contactSfIds.length > 0
    ? await supabaseAdmin.from("contact").select("contact_sf_id").in("contact_sf_id", contactSfIds)
    : { data: [] };
  const validContactSfIds = new Set((existingContacts || []).map((ct: any) => ct.contact_sf_id));

  // Prepare insert data
  const insertData = toInsert.map((c: any) => {
    const contactSfId = c.submitterBy || c.contactId || null;
    return {
      case_sf_id: c.caseId || null,
      contact_sf_id: contactSfId && validContactSfIds.has(contactSfId) ? contactSfId : null,
      caseNumber: c.caseNumber || `SF-${c.caseId}`,
      subject: c.subject || "No subject",
      description: c.description || null,
      resolution: c.resolved || c.resolution || c.Resolution__c || c.closeReason || c.Closed_Reason__c || null,
      status: c.status || "New",
      severity: c.severity || null,
    };
  });

  try {
    const { data: inserted, error } = await supabaseAdmin
      .from("case")
      .insert(insertData)
      .select("id, case_sf_id, caseNumber, subject, status, severity");

    if (error) {
      console.error("[Sync Cases] Insert error:", error);
      const pgError = parsePgError(error);
      return NextResponse.json({
        error: pgError.reason,
        code: "SCS-007",
        message: pgError.reason,
        detail: pgError.detail,
        pgCode: pgError.code,
      }, { status: 500 });
    }

    return NextResponse.json({
      code: "SCS-OK",
      message: `Berhasil mengimport ${inserted?.length || 0} case baru.`,
      inserted: inserted?.length || 0,
      skipped: cases.length - toInsert.length,
      data: inserted,
    }, { status: 201 });

  } catch (error) {
    console.error("[Sync Cases] Insert error:", error);
    const pgError = parsePgError(error);
    return NextResponse.json({
      error: pgError.reason,
      code: "SCS-007",
      message: pgError.reason,
      detail: pgError.detail,
      pgCode: pgError.code,
    }, { status: 500 });
  }
}

// --- Helpers ---

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized", code: "SCS-001", message: "Silakan login terlebih dahulu." }, { status: 401 });
}
function forbidden() {
  return NextResponse.json({ error: "Forbidden", code: "SCS-002", message: "Hanya admin yang dapat sync case." }, { status: 403 });
}
function sfNotConfigured() {
  return NextResponse.json({ error: "SF not configured", code: "SCS-004", message: "Konfigurasi Salesforce belum lengkap." }, { status: 500 });
}

async function getSfSettings(): Promise<{ instanceUrl: string; client_id: string; client_secret: string } | null> {
  const { data: settings } = await supabaseAdmin
    .from("settings")
    .select("client_id, client_secret, base_url")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!settings?.client_id || !settings?.client_secret || !settings?.base_url) return null;

  const instanceUrl = settings.base_url.includes("/services/oauth2/token")
    ? settings.base_url.replace("/services/oauth2/token", "")
    : settings.base_url;

  return { instanceUrl, client_id: settings.client_id, client_secret: settings.client_secret };
}

async function getSfToken(settings: { instanceUrl: string; client_id: string; client_secret: string }): Promise<string | null> {
  const res = await fetch(`${settings.instanceUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: settings.client_id,
      client_secret: settings.client_secret,
    }),
  });
  if (!res.ok) return null;
  const { access_token } = await res.json();
  return access_token;
}
