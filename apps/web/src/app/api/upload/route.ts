import { NextResponse } from "next/server";
import {
  loadConfig,
  ensureBucket,
  uploadFile,
  enqueueValidation,
  type ProcessingJob,
} from "@ibn-al-azhar-docs/pipeline";
import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB (Raised from 100MB)

export async function POST(request: Request) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) {
      return unauthorizedResponse();
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderId = (formData.get("folderId") as string) || null;
    const pageRange = (formData.get("pageRange") as string) || null;

    if (!file) {
      return NextResponse.json({ error: "لم يتم رفع أي ملف" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "نوع الملف غير مدعوم. يرجى رفع PDF أو JPG أو PNG" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "حجم الملف يتجاوز الحد المسموح (5GB)" }, { status: 400 });
    }

    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, userId: session.user.id, deletedAt: null },
      });
      if (!folder) {
        return NextResponse.json({ error: "المجلد غير موجود" }, { status: 404 });
      }
    }

    const config = loadConfig();
    await ensureBucket(config);

    const jobId = randomUUID();
    const fileName = file.name;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Write temp file — sanitize filename to prevent path traversal
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
    const tempPath = join(tmpdir(), `${jobId}_${safeName}`);
    await writeFile(tempPath, buffer);

    // Upload to MinIO
    const storageKey = `${config.paths.uploads}/${jobId}/${safeName}`;
    const uploaded = await uploadFile(config, storageKey, tempPath, file.type);

    // Clean up temp
    await unlink(tempPath);

    // Create Document record in database
    const document = await prisma.document.create({
      data: {
        id: jobId,
        userId: session.user.id,
        title: fileName.replace(/\.(pdf|png|jpg|jpeg)$/i, ""),
        fileName,
        originalName: fileName,
        mimeType: file.type,
        fileSize: file.size,
        storageKey: uploaded.key,
        status: "UPLOADED",
        folderId: folderId || null,
        pageRange: pageRange || null,
      },
    });

    // Create processing job
    const job: ProcessingJob = {
      id: jobId,
      documentId: document.id,
      userId: session.user.id,
      fileName,
      fileSize: file.size,
      mimeType: file.type,
      storageKey: uploaded.key,
      status: "pending",
      progress: 0,
      createdAt: new Date().toISOString(),
      pageRange: pageRange || undefined,
    };

    // Enqueue validation
    await enqueueValidation(config, job);

    return NextResponse.json({
      success: true,
      jobId,
      documentId: document.id,
      fileName,
      fileSize: file.size,
      status: "pending",
      message: "تم رفع الملف بنجاح وبدء المعالجة",
    });
  } catch (error: unknown) {
    logger.error(error, "[upload] Failed:");
    return NextResponse.json({ error: "فشل رفع الملف" }, { status: 500 });
  }
}
