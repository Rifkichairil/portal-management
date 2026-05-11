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

  const maskValue = (value?: string) =>
    value ? `${value.slice(0, 6)}...${value.slice(-4)} (len:${value.length})` : "missing";

  console.log(`[Salesforce API - ${type}] Settings fetched:`, {
    hasClientId: !!settings?.client_id,
    hasClientSecret: !!settings?.client_secret,
    hasBaseUrl: !!settings?.base_url,
    baseUrl: settings?.base_url,
    clientIdFingerprint: maskValue(settings?.client_id),
    clientSecretFingerprint: maskValue(settings?.client_secret),
  });

  if (!settings?.client_id || !settings?.client_secret || !settings?.base_url) {
    console.error(`[Salesforce API - ${type}] Salesforce credentials not configured`);
    return NextResponse.json({ error: "Salesforce credentials not configured" }, { status: 500 });
  }

  try {
    // Get OAuth token from Salesforce
    const instanceUrl = settings.base_url.includes('/services/oauth2/token')
      ? settings.base_url.replace('/services/oauth2/token', '')
      : settings.base_url;

    console.log(`[Salesforce API - ${type}] Instance URL:`, instanceUrl);

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
      let egressIp = "unknown";

      try {
        const ipRes = await fetch("https://api.ipify.org?format=json", {
          method: "GET",
          cache: "no-store",
        });
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          egressIp = ipData?.ip || "unknown";
        }
      } catch (ipError) {
        console.error(`[Salesforce API - ${type}] Failed to resolve egress IP:`, ipError);
      }

      console.error(`[Salesforce API - ${type}] Failed to get Salesforce token:`, {
        error: errText,
        egressIp,
        tokenUrl: `${instanceUrl}/services/oauth2/token`,
        clientIdFingerprint: maskValue(settings.client_id),
        baseUrl: settings.base_url,
      });
      return NextResponse.json({ error: "Failed to authenticate with Salesforce" }, { status: 500 });
    }

    const { access_token } = await tokenRes.json();
    console.log(`[Salesforce API - ${type}] Successfully obtained access token`);

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
    const dataUrl = `${instanceUrl}${endpoint}?id=${caseId}`;
    console.log(`[Salesforce API - ${type}] Fetching data from:`, dataUrl);

    const dataRes = await fetch(
      dataUrl,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!dataRes.ok) {
      const errText = await dataRes.text();
      console.error(`[Salesforce API - ${type}] Failed to fetch ${type} from Salesforce:`, errText);
      return NextResponse.json({ error: `Failed to fetch ${type} from Salesforce` }, { status: 500 });
    }

    const data = await dataRes.json();
    console.log(`[Salesforce API - ${type}] Successfully fetched ${type} data:`, data);
    return NextResponse.json(data);

  } catch (error) {
    console.error("Error fetching Salesforce data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
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
  const type = unwrappedParams.type;

  // Handle different POST requests
  if (type === "comments") {
    const searchParams = request.nextUrl.searchParams;
    const caseId = searchParams.get("id");

    if (!caseId) {
      return NextResponse.json({ error: "Case ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { commentBody } = body;

    if (!commentBody) {
      return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
    }

    // Fetch settings
    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("client_id, client_secret, base_url")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!settings?.client_id || !settings?.client_secret || !settings?.base_url) {
      console.error("[Salesforce API - POST comments] Salesforce credentials not configured");
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
        console.error("[Salesforce API - POST comments] Failed to get Salesforce token");
        return NextResponse.json({ error: "Failed to authenticate with Salesforce" }, { status: 500 });
      }

      const { access_token } = await tokenRes.json();

      // Post comment to Salesforce
      const dataUrl = `${instanceUrl}/services/apexrest/portal/case/comments?id=${caseId}`;
      console.log("[Salesforce API - POST comments] Posting comment to:", dataUrl);

      const dataRes = await fetch(
        dataUrl,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ commentBody }),
        }
      );

      if (!dataRes.ok) {
        const errText = await dataRes.text();
        console.error("[Salesforce API - POST comments] Failed to post comment:", errText);
        return NextResponse.json({ error: "Failed to post comment to Salesforce" }, { status: 500 });
      }

      const data = await dataRes.json();
      console.log("[Salesforce API - POST comments] Successfully posted comment:", data);
      return NextResponse.json(data);

    } catch (error) {
      console.error("[Salesforce API - POST comments] Error posting comment:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  } else if (type === "attachments") {
    let payload: { caseId?: string; images?: Array<{ fileName: string; base64Data: string }> };

    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const caseId = payload.caseId;
    const images = payload.images || [];

    if (!caseId) {
      return NextResponse.json({ error: "Case ID is required" }, { status: 400 });
    }

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "Images are required" }, { status: 400 });
    }

    // Fetch settings
    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("client_id, client_secret, base_url")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!settings?.client_id || !settings?.client_secret || !settings?.base_url) {
      console.error("[Salesforce API - POST attachments] Salesforce credentials not configured");
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
        console.error("[Salesforce API - POST attachments] Failed to get Salesforce token");
        return NextResponse.json({ error: "Failed to authenticate with Salesforce" }, { status: 500 });
      }

      const { access_token } = await tokenRes.json();

      const dataUrl = `${instanceUrl}/services/apexrest/portal/case/images?id=${caseId}`;
      console.log("[Salesforce API - POST attachments] Uploading images to:", dataUrl);
      console.log("[Salesforce API - POST attachments] Total images:", images.length);

      const dataRes = await fetch(
        dataUrl,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ images }),
        }
      );

      if (!dataRes.ok) {
        const errText = await dataRes.text();
        console.error("[Salesforce API - POST attachments] Failed to upload images to Salesforce:", errText);
        return NextResponse.json({ error: "Failed to upload images to Salesforce" }, { status: 500 });
      }

      const data = await dataRes.json();
      console.log("[Salesforce API - POST attachments] Successfully uploaded images:", data);
      return NextResponse.json(data);

    } catch (error) {
      console.error("[Salesforce API - POST attachments] Error uploading images:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  } else {
    return NextResponse.json({ error: "POST only supported for comments and attachments" }, { status: 400 });
  }
}
