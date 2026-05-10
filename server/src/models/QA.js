import { Schema, model } from "mongoose";

export const qaSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    askedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    question: { type: String, required: true, maxlength: 300, trim: true },
    answer: { type: String, default: null, maxlength: 1000, trim: true },
    isAnswered: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const QAModel = model("QA", qaSchema);
