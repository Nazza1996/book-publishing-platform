import type { Request } from "express";
import type { Transaction } from "sequelize";
import AuditLog, { type AuditAction } from "../models/AuditLog.js";
import type { AuthUser } from "../middleware/auth.js";

type AuditLogInput = {
    action: AuditAction;
    entityType: string;
    entityId?: string | number | null;
    entityLabel?: string | null;
    metadata?: Record<string, unknown> | null;
    transaction?: Transaction;
};

export async function recordAuditLog(req: Request, input: AuditLogInput) {
    const user = (req as any).user as AuthUser | undefined;

    await AuditLog.create(
        {
            action: input.action,
            entityType: input.entityType,
            entityId: input.entityId === undefined || input.entityId === null ? null : String(input.entityId),
            entityLabel: input.entityLabel ?? null,
            userId: user?.id ?? null,
            requestMethod: req.method,
            requestPath: req.originalUrl,
            metadata: input.metadata ?? null,
        },
        { transaction: input.transaction }
    );
}
