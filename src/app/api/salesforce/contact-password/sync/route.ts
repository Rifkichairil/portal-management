import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@/lib/auth";
import { parsePgError } from "@/lib/supabase-error";
import bcrypt from "bcryptjs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Error codes:
// SYNC-001: Unauthorized
// SYNC-002: Forbidden - not admin
// SYNC-003: Missing required fields
// SYNC-004: Email already exists
// SYNC-005: Account not found
// SYNC-006: Database insert error (user)
// SYNC-007: Database insert error (contact)
// SYNC-008: Internal server error

export async function POST(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) {
    return NextResponse.json({
      error: "Unauthorized",
      code: "SYNC-001",
      message: "Silakan login terlebih dahulu.",
    }, { status: 401 });
  }

  const sessionUser = await verifyToken(token);
  if (!sessionUser) {
    return NextResponse.json({
      error: "Invalid or expired session",
      code: "SYNC-001",
      message: "Sesi telah berakhir. Silakan login ulang.",
    }, { status: 401 });
  }

  // Only admins can insert contacts
  if (sessionUser.role !== "admin") {
    return NextResponse.json({
      error: "Forbidden: Admin access required",
      code: "SYNC-002",
      message: "Hanya admin yang dapat menyimpan data ke database.",
    }, { status: 403 });
  }

  const body = await request.json();
  const { contactData, accountSfId } = body;

  if (!contactData) {
    return NextResponse.json({
      error: "Contact data is required",
      code: "SYNC-003",
      message: "Data contact wajib diisi.",
    }, { status: 400 });
  }

  if (!accountSfId) {
    return NextResponse.json({
      error: "Salesforce Account ID is required",
      code: "SYNC-003",
      message: "Salesforce Account ID wajib diisi.",
    }, { status: 400 });
  }

  const email = contactData.email;
  if (!email) {
    return NextResponse.json({
      error: "Email is required",
      code: "SYNC-003",
      message: "Email contact wajib diisi.",
    }, { status: 400 });
  }

  try {
    // 1. Check if email already exists in users table
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({
        code: "SYNC-SKIP",
        message: `User dengan email "${email}" sudah terdaftar, dilewati.`,
        skipped: true,
      }, { status: 200 });
    }

    // 2. Find account by account_sf_id
    const { data: account } = await supabaseAdmin
      .from("account")
      .select("id, name, account_sf_id")
      .eq("account_sf_id", accountSfId)
      .maybeSingle();

    if (!account) {
      return NextResponse.json({
        error: "Account not found",
        code: "SYNC-005",
        message: `Account dengan Salesforce ID "${accountSfId}" tidak ditemukan di database. Silakan sync account terlebih dahulu.`,
      }, { status: 404 });
    }

    // 3. Generate username from email (ambil sebelum @)
    const username = email.split("@")[0].toLowerCase();

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(contactData.password || "default123", 10);

    // 5. Insert into users table
    const { data: newUser, error: userError } = await supabaseAdmin
      .from("users")
      .insert({
        username,
        email: email,
        password: hashedPassword,
        role: contactData.role || "submittercase",
      })
      .select("id, email, username, role")
      .single();

    if (userError) {
      console.error("[Sync Contact Password] User insert error:", userError);
      const pgError = parsePgError(userError);
      return NextResponse.json({
        error: pgError.reason,
        code: "SYNC-006",
        message: pgError.reason,
        detail: pgError.detail,
        pgCode: pgError.code,
      }, { status: 500 });
    }

    // 6. Insert into contact table
    const { data: newContact, error: contactError } = await supabaseAdmin
      .from("contact")
      .insert({
        contact_sf_id: contactData.contactId || null,
        account_id: account.id,
        user_id: newUser.id,
        firstName: contactData.firstName || null,
        lastName: contactData.lastName || null,
        fullName: contactData.fullName || `${contactData.firstName || ""} ${contactData.lastName || ""}`.trim() || null,
        title: contactData.title || null,
        department: contactData.department || null,
        phone: contactData.phone || null,
        mobile: contactData.mobilePhone || null,
        password: contactData.password || null,
      })
      .select("id, contact_sf_id, account_id, firstName, lastName, fullName, phone, mobile, title, created_at")
      .single();

    if (contactError) {
      // Rollback: delete the user that was just created
      await supabaseAdmin.from("users").delete().eq("id", newUser.id);
      console.error("[Sync Contact Password] Contact insert error:", contactError);
      const pgError = parsePgError(contactError);
      return NextResponse.json({
        error: pgError.reason,
        code: "SYNC-007",
        message: pgError.reason,
        detail: pgError.detail,
        pgCode: pgError.code,
      }, { status: 500 });
    }

    return NextResponse.json({
      user: { id: newUser.id, email: newUser.email, username: newUser.username, role: newUser.role },
      contact: newContact,
      message: `Contact "${newContact.fullName || newContact.firstName || email}" berhasil ditambahkan.`,
      code: "SYNC-OK",
    }, { status: 201 });

  } catch (error) {
    console.error("[Sync Contact Password] Error:", error);
    const pgError = parsePgError(error);
    return NextResponse.json({
      error: pgError.reason,
      code: "SYNC-008",
      message: pgError.reason,
      detail: pgError.detail,
      pgCode: pgError.code,
    }, { status: 500 });
  }
}
