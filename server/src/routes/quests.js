import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { QuestModel } from "../models/Quest.js";
import { QuestProgressModel } from "../models/QuestProgress.js";
import { ensureWeeklyQuests, progressQuest } from "../utils/quests.js";

export const questsRouter = Router();

questsRouter.get("/active", requireAuth, async (req, res) => {
  await ensureWeeklyQuests();
  const now = new Date();
  const quests = await QuestModel.find({ isActive: true, weekEnd: { $gt: now } })
    .sort({ weekStart: -1, createdAt: 1 })
    .limit(3)
    .lean();

  const items = await Promise.all(
    quests.map(async (quest) => {
      const progress = await QuestProgressModel.findOneAndUpdate(
        { user: req.user.id, quest: quest._id },
        { $setOnInsert: { progress: 0, completed: false } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean();
      return { ...quest, progress: progress?.progress ?? 0, completed: Boolean(progress?.completed) };
    }),
  );

  return res.json({ quests: items });
});

questsRouter.post("/progress", requireAuth, async (req, res) => {
  const questType = String(req.body.questType ?? "");
  const progress = await progressQuest(req.user.id, questType);
  return res.json({ progress });
});
