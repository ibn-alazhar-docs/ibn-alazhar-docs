import { NextRequest, NextResponse } from "next/server";

/**
 * CSP Violation Report Endpoint
 * يستقبل تقارير انتهاك CSP من المتصفح
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const violation = {
      timestamp: new Date().toISOString(),
      "document-uri": body["document-uri"] ?? body.documentURI ?? "",
      referrer: body.referrer ?? "",
      "blocked-uri": body["blocked-uri"] ?? body.blockedURI ?? "",
      "violated-directive": body["violated-directive"] ?? body.violatedDirective ?? "",
      "effective-directive": body["effective-directive"] ?? body.effectiveDirective ?? "",
      "original-policy": body["original-policy"] ?? body.originalPolicy ?? "",
      "status-code": body["status-code"] ?? body.statusCode ?? 0,
      "script-sample": body["script-sample"] ?? body.scriptSample ?? "",
    };

    // Log to stdout for collection by log aggregator
    console.log(JSON.stringify({ level: "warn", msg: "CSP_VIOLATION", ...violation }));

    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 400 });
  }
}
