import { CommentModel } from "../models/Comment.js";
import { PostModel } from "../models/Post.js";
import { UserModel } from "../models/User.js";

export function monthStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date;
}

export async function recalculateMonthlyLeaderboard() {
  const since = monthStartDate();
  const [users, posts, commentCounts] = await Promise.all([
    UserModel.find({ role: { $ne: "admin" } }).select("_id").lean(),
    PostModel.find({
      status: { $in: ["approved", "published"] },
      createdAt: { $gte: since },
    })
      .select("author views likes")
      .lean(),
    CommentModel.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]),
  ]);

  const commentsByPost = new Map(
    commentCounts.map((item) => [String(item._id), item.count]),
  );
  const scoreByUser = new Map(users.map((user) => [String(user._id), 0]));

  for (const post of posts) {
    const authorId = String(post.author);
    const score =
      (post.views ?? 0) +
      ((post.likes ?? []).length * 3) +
      ((commentsByPost.get(String(post._id)) ?? 0) * 2);
    scoreByUser.set(authorId, (scoreByUser.get(authorId) ?? 0) + score);
  }

  const ranked = [...scoreByUser.entries()].sort((a, b) => b[1] - a[1]);
  const badgeForIndex = (index, score) => {
    if (score <= 0) return null;
    if (index === 0) return "gold";
    if (index === 1) return "silver";
    if (index === 2) return "bronze";
    return null;
  };

  if (ranked.length > 0) {
    await UserModel.bulkWrite(
      ranked.map(([userId, score], index) => ({
        updateOne: {
          filter: { _id: userId },
          update: {
            $set: {
              monthlyScore: score,
              leaderboardBadge: badgeForIndex(index, score),
            },
          },
        },
      })),
    );
  }

  return ranked;
}
