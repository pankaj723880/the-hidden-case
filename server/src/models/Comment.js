import { Schema, model } from "mongoose";

export const commentSchema = new Schema(
  {
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    replies: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    reactions: {
      type: Map,
      of: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: () => new Map(),
    },
  },
  { timestamps: true },
);

export const CommentModel = model("Comment", commentSchema);
