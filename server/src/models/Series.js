import { Schema, model } from "mongoose";

const seriesSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    posts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    coverImage: { type: String, default: "" },
  },
  { timestamps: true },
);

export const SeriesModel = model("Series", seriesSchema);
