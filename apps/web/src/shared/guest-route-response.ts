import { NextResponse } from "next/server";

/**
 * Single JSON error shape for guest routes, matching `{ error: { code, message } }`
 * used by the rest of the API (see `handleRouteError`). Kept separate from
 * `route-helpers` because guest failures carry a machine-readable code chosen by
 * the use-case (`GuestRejectCode`), not an exception message.
 */
export function guestServiceFailureResponse(result: {
  status: number;
  code: string;
  message: string;
  retryAfterMs?: number;
}): NextResponse {
  const headers = new Headers();
  if (result.retryAfterMs) {
    headers.set("Retry-After", String(Math.ceil(result.retryAfterMs / 1000)));
  }
  return NextResponse.json(
    { error: { code: result.code, message: result.message } },
    {
      status: result.status,
      headers,
    },
  );
}

/**
 * RFC 5987 encoding so Arabic download names survive: `filename=` is ASCII-only,
 * so the raw name is passed separately in the extended parameter.
 */
export function contentDisposition(kind: "attachment" | "inline", fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
