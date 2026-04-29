import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = await verifyToken(token);
  if (!sessionUser) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  // Get pagination parameters
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "10");
  const offset = (page - 1) * pageSize;

  // Build query with role-based filtering
  let query = supabaseAdmin
    .from("error_log")
    .select(`
      id,
      error_type,
      error_message,
      error_details,
      created_at,
      case_id,
      user_id,
      case:case_id (
        caseNumber,
        subject
      ),
      user:user_id (
        username,
        email
      )
    `, { count: "exact" });

  // Non-admin users can only see their own error logs
  if (sessionUser.role !== 'admin') {
    query = query.eq("user_id", sessionUser.id);
  }

  // Fetch error logs with pagination
  const { data: errorLogs, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    errorLogs,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize)
    }
  });
}
