import { CommentModel } from "../models/Comment.js";
import mongoose from "mongoose";
import { PostModel } from "../models/Post.js";
import { UserModel } from "../models/User.js";
import { awardBadge } from "./awardBadge.js";

export async function checkBadges(userId) {
  if (!userId) return;

  const [postCount, user, commentCount, likesResult] = await Promise.all([
    PostModel.countDocuments({
      author: userId,
      status: { $in: ["approved", "published"] },
    }),
    UserModel.findById(userId)
      .select("followers currentStreak badges")
      .lean(),
    CommentModel.countDocuments({ author: userId }),
    PostModel.aggregate([
      { $match: { author: new mongoose.Types.ObjectId(userId) } },
      { $project: { likeCount: { $size: { $ifNull: ["$likes", []] } } } },
      { $group: { _id: null, total: { $sum: "$likeCount" } } },
    ]),
  ]);

  if (!user) return;

  const earned = [];
  const totalLikes = likesResult[0]?.total ?? 0;

  if (postCount >= 1) earned.push("first_post");
  if (postCount >= 10) earned.push("ten_posts");
  if (totalLikes >= 100) earned.push("hundred_likes");
  if ((user.followers ?? []).length >= 50) earned.push("fifty_followers");
  if ((user.currentStreak ?? 0) >= 7) earned.push("streak_7");
  if ((user.currentStreak ?? 0) >= 30) earned.push("streak_30");
  if (commentCount >= 1) earned.push("first_comment");
  if (commentCount >= 100) earned.push("hundred_comments");

  await Promise.all(earned.map((badgeId) => awardBadge(userId, badgeId)));
}
