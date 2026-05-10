import { Schema, model } from "mongoose";

const plagiarismReportSchema = new Schema({
  post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
  similarityScore: { type: Number, default: 0 },
  matchedPost: { type: Schema.Types.ObjectId, ref: "Post", default: null },
  matchedPostTitle: { type: String, default: "" },
  status: {
    type: String,
    enum: ["flagged", "cleared", "dismissed"],
    default: "flagged",
  },
  checkedAt: { type: Date, default: Date.now },
});

export const PlagiarismReportModel = model(
  "PlagiarismReport",
  plagiarismReportSchema,
);
