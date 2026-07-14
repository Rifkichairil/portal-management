import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@/lib/auth";
import { parsePgError } from "@/lib/supabase-error";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Error codes:
// DB-001: Unauthorized - no session token
// DB-002: Forbidden - not admin
// DB-003: Missing required fields (name or account_sf_id)
// DB-004: Duplicate Salesforce ID
// DB-005: Database insert error
// DB-006: Internal server error

export async function POST(request: NextRequest) {
  // Authenticate user via session_token cookie
  const token = request.cookies.get("session_token")?.value;
  if (!token) {
    return NextResponse.json({
      error: "Unauthorized",
      code: "DB-001",
      message: "Silakan login terlebih dahulu.",
    }, { status: 401 });
  }

  const sessionUser = await verifyToken(token);
  if (!sessionUser) {
    return NextResponse.json({
      error: "Invalid or expired session",
      code: "DB-001",
      message: "Sesi telah berakhir. Silakan login ulang.",
    }, { status: 401 });
  }

  // Only admins can insert accounts
  if (sessionUser.role !== "admin") {
    return NextResponse.json({
      error: "Forbidden: Admin access required",
      code: "DB-002",
      message: "Hanya admin yang dapat menambahkan account.",
    }, { status: 403 });
  }

  const body = await request.json();
  const {
    name,
    account_sf_id,
    phone,
    email,
    website,
    billingStreet,
    billingCity,
    billingState,
    billingCountry,
    billingPostalCode,
  } = body;

  if (!name) {
    return NextResponse.json({
      error: "Name is required",
      code: "DB-003",
      message: "Nama account wajib diisi.",
    }, { status: 400 });
  }

  if (!account_sf_id) {
    return NextResponse.json({
      error: "Salesforce Account ID is required",
      code: "DB-003",
      message: "Salesforce Account ID wajib diisi.",
    }, { status: 400 });
  }

  // Check for duplicate Salesforce ID
  const { data: existingAccount } = await supabaseAdmin
    .from("account")
    .select("id, name")
    .eq("account_sf_id", account_sf_id)
    .maybeSingle();

  if (existingAccount) {
    return NextResponse.json({
      error: "Duplicate Salesforce ID",
      code: "DB-004",
      message: `Account dengan Salesforce ID "${account_sf_id}" sudah ada: "${existingAccount.name}".`,
      existingAccount: existingAccount,
    }, { status: 409 });
  }

  try {
    const { data: newAccount, error: insertError } = await supabaseAdmin
      .from("account")
      .insert({
        account_sf_id,
        name,
        phone: phone || null,
        email: email || null,
        website: website || null,
        billingStreet: billingStreet || null,
        billingCity: billingCity || null,
        billingState: billingState || null,
        billingCountry: billingCountry || null,
        billingPostalCode: billingPostalCode || null,
      })
      .select("id, account_sf_id, name, phone, email, website, billingStreet, billingCity, billingState, billingCountry, billingPostalCode, created_at")
      .single();

    if (insertError) {
      console.error("[Sync Salesforce Account] Supabase insert error:", insertError);
      const pgError = parsePgError(insertError);
      return NextResponse.json({
        error: pgError.reason,
        code: "DB-005",
        message: pgError.reason,
        detail: pgError.detail,
        pgCode: pgError.code,
      }, { status: 500 });
    }

    return NextResponse.json({
      account: newAccount,
      message: `Account "${name}" berhasil ditambahkan.`,
      code: "DB-OK",
    }, { status: 201 });
  } catch (error) {
    console.error("[Sync Salesforce Account] Error inserting account:", error);
    const pgError = parsePgError(error);
    return NextResponse.json({
      error: pgError.reason,
      code: "DB-006",
      message: pgError.reason,
      detail: pgError.detail,
    }, { status: 500 });
  }
}
