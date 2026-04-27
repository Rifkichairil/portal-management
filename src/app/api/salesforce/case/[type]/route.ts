import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  // Authenticate user via session_token cookie
  const token = request.cookies.get("session_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = await verifyToken(token);
  if (!sessionUser) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  const unwrappedParams = await params;
  const type = unwrappedParams.type; // "activity", "comments", or "attachments"
  const searchParams = request.nextUrl.searchParams;
  const caseId = searchParams.get("id");

  if (!caseId) {
    return NextResponse.json({ error: "Case ID is required" }, { status: 400 });
  }

  // Validate type
  const validTypes = ["activity", "comments", "attachments"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid type. Must be activity, comments, or attachments" }, { status: 400 });
  }

  // Fetch settings
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
    // Get OAuth token from Salesforce
    const instanceUrl = settings.base_url.includes('/services/oauth2/token')
      ? settings.base_url.replace('/services/oauth2/token', '')
      : settings.base_url;

    const tokenRes = await fetch(
      `${instanceUrl}/services/oauth2/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: settings.client_id,
          client_secret: settings.client_secret,
        }),
      }
    );

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Failed to get Salesforce token:", errText);
      return NextResponse.json({ error: "Failed to authenticate with Salesforce" }, { status: 500 });
    }

    const { access_token } = await tokenRes.json();

    // Determine endpoint based on type
    let endpoint: string;
    switch (type) {
      case "activity":
        endpoint = "/services/apexrest/portal/case/histories";
        break;
      case "comments":
        endpoint = "/services/apexrest/portal/case/comments";
        break;
      case "attachments":
        endpoint = "/services/apexrest/portal/case/images";
        break;
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // Fetch data from Salesforce
    const dataRes = await fetch(
      `${instanceUrl}${endpoint}?id=${caseId}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!dataRes.ok) {
      const errText = await dataRes.text();
      console.error(`Failed to fetch ${type} from Salesforce:`, errText);
      return NextResponse.json({ error: `Failed to fetch ${type} from Salesforce` }, { status: 500 });
    }

    const data = await dataRes.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Error fetching Salesforce data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
