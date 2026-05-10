import { Schema, model } from "mongoose";

export const suspiciousActivitySchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", default: null },
  ip: { type: String, default: "" },
  type: {
    type: String,
    enum: ["like_farming", "rapid_comments", "mass_registration", "rapid_follows"],
    required: true,
  },
  details: { type: String, default: "" },
  count: { type: Number, default: 0 },
  detectedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["open", "reviewed", "dismissed"], default: "open" },
});

export const SuspiciousActivityModel = model("SuspiciousActivity", suspiciousActivitySchema);
