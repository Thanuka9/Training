import type { Request } from "express";
import { prisma } from "../config/prisma.js";
import { writeAuditLog } from "../utils/audit.js";

export async function getSettings() {
  return prisma.appSetting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", allowHybridDelivery: true },
  });
}

export async function updateSettings(
  allowHybridDelivery: boolean,
  actorUserId: string,
  req: Request,
) {
  const before = await getSettings();
  const after = await prisma.appSetting.update({
    where: { id: "default" },
    data: { allowHybridDelivery },
  });
  await writeAuditLog({
    actorUserId,
    action: "SETTINGS_UPDATED",
    entityType: "AppSetting",
    entityId: "default",
    before,
    after,
    req,
  });
  return after;
}
