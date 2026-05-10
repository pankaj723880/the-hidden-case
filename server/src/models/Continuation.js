import { Schema, model } from "mongoose";

export const continuationSchema = new Schema(
  {
    originalPost: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    type: { type: String, enum: ["official", "fan"], default: "fan" },
  },
  { timestamps: true },
);

export const ContinuationModel = model("Continuation", continuationSchema);
