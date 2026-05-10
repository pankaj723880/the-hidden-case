import { Schema, model } from "mongoose";

export const auditLogSchema = new Schema(
  {
    admin: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    targetType: {
      type: String,
      enum: ["post", "comment", "user", "report", "series"],
    },
    targetId: { type: Schema.Types.ObjectId, default: null },
    targetName: { type: String, default: "" },
    details: { type: String, default: "" },
    ip: { type: String, default: "" },
  },
  { timestamps: true },
);

export const AuditLogModel = model("AuditLog", auditLogSchema);
