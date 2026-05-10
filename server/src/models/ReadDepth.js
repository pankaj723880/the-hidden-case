import { Schema, model } from "mongoose";

export const readDepthSchema = new Schema(
  {
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    depth: { type: Number, required: true, min: 0, max: 100 },
    sessionId: { type: String, default: "" },
  },
  { timestamps: true },
);

readDepthSchema.index({ post: 1, depth: 1 });

export const ReadDepthModel = model("ReadDepth", readDepthSchema);
