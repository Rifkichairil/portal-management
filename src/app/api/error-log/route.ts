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

  // Fetch error logs
  const { data: errorLogs, error } = await supabaseAdmin
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
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ errorLogs });
}
