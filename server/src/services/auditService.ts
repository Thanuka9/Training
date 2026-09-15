import { prisma } from "../config/prisma.js";
import { parsePagination, paginatedResult } from "../utils/pagination.js";
import type { Prisma } from "@prisma/client";

export async function listAuditLogs(query: Record<string, unknown>) {
  const { skip, take, page, pageSize, search, sortDirection } = parsePagination(query);
  const where: Prisma.AuditLogWhereInput = {
    ...(query.action ? { action: String(query.action) } : {}),
    ...(query.entityType ? { entityType: String(query.entityType) } : {}),
    ...(query.entityId ? { entityId: String(query.entityId) } : {}),
    ...(query.actorUserId ? { actorUserId: String(query.actorUserId) } : {}),
    ...(search
      ? {
          OR: [
            { action: { contains: search } },
            { entityType: { contains: search } },
            { entityId: { contains: search } },
            { actor: { is: { fullName: { contains: search } } } },
            { actor: { is: { bankId: { contains: search } } } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: sortDirection },
      include: { actor: { select: { fullName: true, bankId: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return paginatedResult(
    items.map((item) => ({
      id: item.id,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      createdAt: item.createdAt,
      ipAddress: item.ipAddress,
      actor: item.actor,
      before: item.beforeJson ? JSON.parse(item.beforeJson) : null,
      after: item.afterJson ? JSON.parse(item.afterJson) : null,
    })),
    total,
    page,
    pageSize,
  );
}
