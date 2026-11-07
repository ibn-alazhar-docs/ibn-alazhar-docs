import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { diacritizeText } from "@ibn-al-azhar-docs/pipeline";

const MAX_TEXT_LENGTH = 20_000;

const tashkeelSchema = z.object({
  text: z.string(),
});

export const POST = withAuth(async (request) => {
  try {
    const body: unknown = await request.json();
    const parsed = tashkeelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "نص غير صالح" } },
        { status: 400 },
      );
    }

    const { text } = parsed.data;
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: { code: "TOO_LONG", message: "النص يتجاوز الحد المسموح" } },
        { status: 400 },
      );
    }

    const outcome = await diacritizeText(text);
    return NextResponse.json(
      { result: outcome.text },
      { headers: { "Cache-Control": "no-store, must-revalidate" } },
    );
  } catch (error: unknown) {
    return handleRouteError(error, "tools/tashkeel/POST", "حدث خطأ");
  }
});
