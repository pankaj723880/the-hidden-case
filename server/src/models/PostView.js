import { Schema, model } from "mongoose";

export const postViewSchema = new Schema(
  {
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    source: {
      type: String,
      enum: ["direct", "search", "social", "internal", "unknown"],
      default: "unknown",
    },
    referrer: { type: String, default: "" },
    sessionId: { type: String, default: "" },
  },
  { timestamps: true },
);

export const PostViewModel = model("PostView", postViewSchema);
