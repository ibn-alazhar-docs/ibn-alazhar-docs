import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { addTagToDocumentSchema, setDocumentTagsSchema } from "@/lib/validators/tag";
import { documentUseCases } from "@/core/use-cases/document.use-cases";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id } = await params;

    try {
      const tags = await documentUseCases.getDocumentTags(id, session.user.id);
      return NextResponse.json({ tags });
    } catch (error: unknown) {
      if (getErrorMessage(error) === "NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Document not found" } },
          { status: 404 },
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    logger.error(error, "[documents/[id]/tags/GET] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load tags" } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();
    const validation = addTagToDocumentSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "Invalid data" } },
        { status: 400 },
      );
    }

    const { tagId } = validation.data;

    try {
      const tag = await documentUseCases.addTagToDocument(
        id,
        tagId,
        session.user.id,
        session.user.role,
      );
      return NextResponse.json({ success: true, tag }, { status: 201 });
    } catch (error: unknown) {
      if (getErrorMessage(error) === "NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Document not found" } },
          { status: 404 },
        );
      }
      if (getErrorMessage(error) === "TAG_NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Tag not found" } },
          { status: 404 },
        );
      }
      if (getErrorMessage(error) === "CONFLICT") {
        return NextResponse.json(
          { error: { code: "CONFLICT", message: "Tag already assigned" } },
          { status: 409 },
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    logger.error(error, "[documents/[id]/tags/POST] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to add tag" } },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();
    const validation = setDocumentTagsSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "Invalid data" } },
        { status: 400 },
      );
    }

    const { tagIds } = validation.data;

    try {
      const tagCount = await documentUseCases.setDocumentTags(
        id,
        tagIds,
        session.user.id,
        session.user.role,
      );
      return NextResponse.json({ success: true, tagCount });
    } catch (error: unknown) {
      if (getErrorMessage(error) === "NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Document not found" } },
          { status: 404 },
        );
      }
      if (getErrorMessage(error) === "SOME_TAGS_NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Some tags not found" } },
          { status: 400 },
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    logger.error(error, "[documents/[id]/tags/PUT] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to set tags" } },
      { status: 500 },
    );
  }
}
