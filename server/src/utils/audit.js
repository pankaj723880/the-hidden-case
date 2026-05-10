import { AuditLogModel } from "../models/AuditLog.js";

export async function logAction({
  admin,
  action,
  targetType,
  targetId = null,
  targetName = "",
  details = "",
  ip = "",
}) {
  try {
    if (!admin || !action) return;

    await AuditLogModel.create({
      admin,
      action,
      targetType,
      targetId,
      targetName,
      details,
      ip,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Audit log failed:", err);
  }
}
