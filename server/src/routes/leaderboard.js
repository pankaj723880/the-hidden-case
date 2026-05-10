import { Router } from "express";
import { PostModel } from "../models/Post.js";
import { UserModel } from "../models/User.js";
import { monthStartDate, recalculateMonthlyLeaderboard } from "../utils/leaderboard.js";
import { getCache, setCache } from "../utils/cache.js";

export const leaderboardRouter = Router();

leaderboardRouter.get("/", async (_req, res) => {
  const cached = await getCache("leaderboard");
  if (cached) return res.json(cached);
  await recalculateMonthlyLeaderboard();

  const since = monthStartDate();
  const users = await UserModel.find({ role: { $ne: "admin" } })
    .select("name avatar monthlyScore leaderboardBadge")
    .sort({ monthlyScore: -1, name: 1 })
    .limit(10)
    .lean();

  const postCounts = await PostModel.aggregate([
    {
      $match: {
        status: { $in: ["approved", "published"] },
        createdAt: { $gte: since },
      },
    },
    { $group: { _id: "$author", count: { $sum: 1 } } },
  ]);
  const countByUser = new Map(
    postCounts.map((item) => [String(item._id), item.count]),
  );

  const payload = {
    users: users.map((user) => ({
      ...user,
      postsThisMonth: countByUser.get(String(user._id)) ?? 0,
    })),
  };
  await setCache("leaderboard", payload, 600);
  return res.json(payload);
});
