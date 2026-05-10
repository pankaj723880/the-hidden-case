import { Schema, model } from "mongoose";

const critiqueSchema = new Schema({
  post: { type: Schema.Types.ObjectId, ref: "Post", required: true, unique: true },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  scores: {
    pacing: { type: Number, default: null },
    tone: { type: Number, default: null },
    characterDepth: { type: Number, default: null },
    plotConsistency: { type: Number, default: null },
    readability: { type: Number, default: null },
  },
  summary: { type: String, default: "" },
  strengths: { type: [String], default: [] },
  improvements: { type: [String], default: [] },
  overallScore: { type: Number, default: null },
  generatedAt: { type: Date, default: Date.now },
});

export const CritiqueModel = model("Critique", critiqueSchema);
