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

  const previewUrlParam = request.nextUrl.searchParams.get("previewUrl");
  if (!previewUrlParam) {
    return NextResponse.json({ error: "previewUrl is required" }, { status: 400 });
  }

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
      return NextResponse.json({ error: "Failed to authenticate with Salesforce" }, { status: 500 });
    }

    const { access_token } = await tokenRes.json();

    const instanceHost = new URL(instanceUrl).host;
    let resolvedPreviewUrl: string;

    if (previewUrlParam.startsWith("http://") || previewUrlParam.startsWith("https://")) {
      const parsedUrl = new URL(previewUrlParam);
      const allowedSalesforceHosts = [
        instanceHost,
        ".my.salesforce.com",
        ".sandbox.my.salesforce.com",
        ".salesforce.com",
        ".force.com",
      ];
      const isAllowedHost = allowedSalesforceHosts.some((allowedHost) =>
        allowedHost.startsWith(".") ? parsedUrl.host.endsWith(allowedHost) : parsedUrl.host === allowedHost
      );

      if (!isAllowedHost) {
        return NextResponse.json({ error: "Invalid previewUrl host" }, { status: 400 });
      }

      resolvedPreviewUrl = parsedUrl.toString();
    } else if (previewUrlParam.startsWith("/")) {
      resolvedPreviewUrl = `${instanceUrl}${previewUrlParam}`;
    } else {
      resolvedPreviewUrl = `${instanceUrl}/${previewUrlParam}`;
    }

    const previewRes = await fetch(resolvedPreviewUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!previewRes.ok) {
      const errText = await previewRes.text();
      console.error("[Salesforce API - Attachment Preview] Failed to fetch preview:", errText);
      return NextResponse.json({ error: "Failed to fetch preview from Salesforce" }, { status: 500 });
    }

    const contentType = previewRes.headers.get("content-type") || "application/octet-stream";
    const contentLength = previewRes.headers.get("content-length");
    const body = await previewRes.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        ...(contentLength ? { "Content-Length": contentLength } : {}),
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("[Salesforce API - Attachment Preview] Error fetching preview:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
