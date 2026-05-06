import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { case_sf_id, status } = body;

    if (!case_sf_id) {
      return NextResponse.json({ error: "case_sf_id is required" }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    console.log("[Webhook - Salesforce Case Status] Received request:", {
      case_sf_id,
      status
    });

    // Update case status in Supabase
    const { data, error } = await supabaseAdmin
      .from('case')
      .update({ status })
      .eq('case_sf_id', case_sf_id)
      .select();

    if (error) {
      console.error("[Webhook - Salesforce Case Status] Failed to update case:", error);
      return NextResponse.json({ error: "Failed to update case status" }, { status: 500 });
    }

    console.log("[Webhook - Salesforce Case Status] Successfully updated case:", data);

    return NextResponse.json({
      status_code: 200,
      message: "Case status updated successfully",
      data
    });

  } catch (error) {
    console.error("[Webhook - Salesforce Case Status] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
