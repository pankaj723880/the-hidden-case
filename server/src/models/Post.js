import { Schema, model } from "mongoose";

export const postSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ["story", "blog"], required: true },
    content: { type: String, required: true },
    chapters: [
      {
        title: { type: String, default: "" },
        content: { type: String, required: true },
      },
    ],
    hasChapters: { type: Boolean, default: false },
    coverImage: { type: String, default: "" },
    videoUrl: { type: String, default: "" },
    tags: { type: [String], default: [] },
    contentWarnings: { type: [String], default: [] },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    coAuthors: [{ type: Schema.Types.ObjectId, ref: "User" }],
    coAuthorInvites: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        status: {
          type: String,
          enum: ["pending", "accepted", "declined"],
          default: "pending",
        },
      },
    ],
    series: { type: Schema.Types.ObjectId, ref: "Series", default: null },
    seriesOrder: { type: Number, default: null },
    challenge: { type: Schema.Types.ObjectId, ref: "Challenge", default: null },
    group: { type: Schema.Types.ObjectId, ref: "Group", default: null },
    likes: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "scheduled", "published", "rejected"],
      default: "draft",
    },
    scheduledAt: { type: Date, default: null },
    adminReviewComment: { type: String, default: "", select: false },
    adminReviewedAt: { type: Date, default: null, select: false },
    adminReviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      select: false,
    },
    plagiarismCheck: {
      similarityScore: { type: Number, default: null },
      matchedPost: { type: Schema.Types.ObjectId, ref: "Post", default: null },
      matchedPostTitle: { type: String, default: "" },
      isFlagged: { type: Boolean, default: false },
      checkedAt: { type: Date, default: null },
    },
    views: { type: Number, default: 0 },
    weeklyScore: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    featuredAt: { type: Date, default: null },
    titleTest: {
      variantB: { type: String, default: null },
      clicks: {
        variantA: { type: Number, default: 0 },
        variantB: { type: Number, default: 0 },
      },
      startedAt: { type: Date, default: null },
      winner: { type: String, enum: ["A", "B", null], default: null },
    },
    language: { type: String, default: "en" },
    mood: {
      type: String,
      enum: [
        "dark",
        "hopeful",
        "tense",
        "melancholy",
        "suspenseful",
        "humorous",
        "romantic",
        "philosophical",
        null,
      ],
      default: null,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

postSchema.virtual("readTime").get(function () {
  const wordsPerMinute = 200;
  const text = this.content.replace(/<[^>]+>/g, "");
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
});

postSchema.virtual("excerpt").get(function () {
  const text = this.content.replace(/<[^>]+>/g, "").trim();
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
});

export const PostModel = model("Post", postSchema);
