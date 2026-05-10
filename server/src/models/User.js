import { Schema, model } from "mongoose";

export const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, default: "" },
    googleId: { type: String, default: "", index: true },
    authProvider: { type: String, enum: ["local", "google"], default: "local" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    avatar: { type: String, default: "" },
    bio: { type: String, default: "" },
    following: [{ type: Schema.Types.ObjectId, ref: "User" }],
    followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    bookmarks: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    followedTags: [{ type: String }],
    emailNotifications: { type: Boolean, default: true },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastWrittenAt: { type: Date, default: null },
    monthlyScore: { type: Number, default: 0 },
    leaderboardBadge: {
      type: String,
      enum: ["gold", "silver", "bronze", null],
      default: null,
    },
    badges: [{ type: String }],
    xp: { type: Number, default: 0 },
    level: { type: String, default: "Apprentice" },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, default: null },
    twoFactorRecoveryCodes: [{ type: String }],
    deletionRequestedAt: { type: Date, default: null },
    deletionScheduledFor: { type: Date, default: null },
    refreshToken: { type: String, default: "" },
  },
  { timestamps: true },
);

export const UserModel = model("User", userSchema);
