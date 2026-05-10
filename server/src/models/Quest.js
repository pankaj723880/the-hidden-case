import { Schema, model } from "mongoose";

export const questSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ["read_posts", "comment", "follow", "write", "react"],
      required: true,
    },
    target: { type: Number, required: true },
    xpReward: { type: Number, default: 0 },
    badgeReward: { type: String, default: "" },
    weekStart: { type: Date, required: true },
    weekEnd: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const QuestModel = model("Quest", questSchema);
