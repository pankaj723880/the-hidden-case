import { Schema, model } from "mongoose";

const revisionSchema = new Schema({
  post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, default: "" },
  content: { type: String, default: "" },
  versionNumber: { type: Number, required: true },
  savedAt: { type: Date, default: Date.now },
});

export const RevisionModel = model("Revision", revisionSchema);
