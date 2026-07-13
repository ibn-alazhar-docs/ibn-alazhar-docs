import { prisma } from "@/transport/db";
import type { Prisma } from "@prisma/client";

interface AuditLogParams {
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function auditLog(params: AuditLogParams): Promise<void> {
  try {
    const data: Prisma.AuditLogCreateInput = {
      action: params.action,
      entity: params.entity ?? null,
      entityId: params.entityId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      userId: params.userId ?? null,
    };
    if (params.metadata) {
      data.metadata = params.metadata as Prisma.InputJsonValue;
    }
    await prisma.auditLog.create({ data });
  } catch {
    // Audit log failures should never break the main flow
  }
}

export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: "auth.login.success",
  LOGIN_FAILED: "auth.login.failed",
  LOGIN_LOCKED: "auth.login.locked",
  LOGOUT: "auth.logout",
  REGISTER: "auth.register",
  EMAIL_VERIFIED: "auth.email.verified",
  PASSWORD_RESET_REQUEST: "auth.password.reset.request",
  PASSWORD_RESET_COMPLETE: "auth.password.reset.complete",
  PASSWORD_CHANGE: "auth.password.change",
  DOCUMENT_CREATE: "document.create",
  DOCUMENT_UPDATE: "document.update",
  DOCUMENT_DELETE: "document.delete",
  DOCUMENT_MOVE: "document.move",
  DOCUMENT_RESTORE: "document.restore",
  TAG_CREATE: "tag.create",
  TAG_DELETE: "tag.delete",
  TAG_MERGE: "tag.merge",
  FOLDER_CREATE: "folder.create",
  FOLDER_RENAME: "folder.rename",
  FOLDER_DELETE: "folder.delete",
  SHARE_CREATE: "share.create",
  SHARE_DELETE: "share.delete",
  EXPORT_SINGLE: "export.single",
  EXPORT_BULK: "export.bulk",
  USER_ROLE_CHANGE: "user.role.change",
  USER_DELETE: "user.delete",
  AUTO_TAG_SUGGEST: "document.auto_tag.suggest",
} as const;
