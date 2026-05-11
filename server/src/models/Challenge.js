import { Schema, model } from "mongoose";

export const challengeSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    prompt: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["upcoming", "active", "voting", "ended"],
      default: "upcoming",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    entries: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    winner: {
      post: { type: Schema.Types.ObjectId, ref: "Post", default: null },
      author: { type: Schema.Types.ObjectId, ref: "User", default: null },
      selectedAt: { type: Date, default: null },
    },
    votes: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
      },
    ],
  },
  { timestamps: true },
);

challengeSchema.index({ "votes.user": 1 });

export const ChallengeModel = model("Challenge", challengeSchema);
