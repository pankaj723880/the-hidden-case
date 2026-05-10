import { Schema, model } from "mongoose";

export const questProgressSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    quest: { type: Schema.Types.ObjectId, ref: "Quest", required: true },
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

questProgressSchema.index({ user: 1, quest: 1 }, { unique: true });

export const QuestProgressModel = model("QuestProgress", questProgressSchema);
