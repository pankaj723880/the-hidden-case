import { Router } from "express";
import { PostModel } from "../models/Post.js";
import { isMongoConnected } from "../db/mongoose.js";
import { getCache, setCache } from "../utils/cache.js";

export const tagsRouter = Router();

tagsRouter.get("/tags", async (_req, res) => {
  const cached = await getCache("tags:all");
  if (cached) return res.json(cached);
  if (!isMongoConnected()) return res.json({ tags: [] });

  const tags = await PostModel.aggregate([
    { $match: { status: { $in: ["approved", "published"] } } },
    { $unwind: "$tags" },
    { $match: { tags: { $type: "string", $ne: "" } } },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $project: { _id: 0, tag: "$_id", count: 1 } },
  ]);

  const payload = { tags };
  await setCache("tags:all", payload, 600);
  return res.json(payload);
});
