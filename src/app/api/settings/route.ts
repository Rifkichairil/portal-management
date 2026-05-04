import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  // Authenticate user
  const token = (request as NextRequest).cookies.get("session_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = await verifyToken(token);
  if (!sessionUser) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  // Only admins can access settings
  if (sessionUser.role !== 'admin') {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("id, client_id, client_secret, base_url, salesforce_enabled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}

export async function POST(request: Request) {
  // Authenticate user
  const token = (request as NextRequest).cookies.get("session_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = await verifyToken(token);
  if (!sessionUser) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  // Only admins can modify settings
  if (sessionUser.role !== 'admin') {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { client_id, client_secret, base_url, salesforce_enabled } = body;

  const wantsEnable = salesforce_enabled === true;
  const hasClientId =
    typeof client_id === "string" && client_id.trim().length > 0;
  const hasClientSecret =
    typeof client_secret === "string" && client_secret.trim().length > 0;
  const hasBaseUrl =
    typeof base_url === "string" && base_url.trim().length > 0;

  if (wantsEnable && (!hasClientId || !hasClientSecret || !hasBaseUrl)) {
    return NextResponse.json(
      { error: "Fill API credentials and base URL before enabling Salesforce." },
      { status: 400 }
    );
  }

  // Check if a row already exists
  const { data: existing } = await supabaseAdmin
    .from("settings")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let result;

  if (existing?.id) {
    // Update existing
    const updatePayload: Record<string, unknown> = { salesforce_enabled };
    if (client_id !== undefined) updatePayload.client_id = client_id;
    if (client_secret !== undefined) updatePayload.client_secret = client_secret;
    if (base_url !== undefined) updatePayload.base_url = base_url;

    result = await supabaseAdmin
      .from("settings")
      .update(updatePayload)
      .eq("id", existing.id)
      .select("id, client_id, client_secret, base_url, salesforce_enabled")
      .single();
  } else {
    // Insert new
    result = await supabaseAdmin
      .from("settings")
      .insert({ client_id, client_secret, base_url, salesforce_enabled })
      .select("id, client_id, client_secret, base_url, salesforce_enabled")
      .single();
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: result.data });
}
