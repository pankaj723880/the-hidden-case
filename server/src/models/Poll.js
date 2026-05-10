import { Schema, model } from "mongoose";

export const pollSchema = new Schema(
  {
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    question: { type: String, required: true, trim: true, maxlength: 200 },
    options: [
      {
        text: { type: String, required: true, trim: true },
        votes: [{ type: Schema.Types.ObjectId, ref: "User" }],
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export const PollModel = model("Poll", pollSchema);
