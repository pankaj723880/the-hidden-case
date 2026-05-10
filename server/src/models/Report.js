import { Schema, model } from "mongoose";

export const reportSchema = new Schema(
  {
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    contentType: {
      type: String,
      enum: ["post", "comment", "message"],
      required: true,
    },
    contentId: { type: Schema.Types.ObjectId, required: true },
    reason: {
      type: String,
      enum: ["spam", "inappropriate", "harassment", "misinformation", "other"],
      required: true,
    },
    description: { type: String, default: "", maxlength: 500 },
    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed"],
      default: "pending",
    },
  },
  { timestamps: true },
);

reportSchema.index({ reporter: 1, contentId: 1 }, { unique: true });

export const ReportModel = model("Report", reportSchema);
