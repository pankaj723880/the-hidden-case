import { QuestModel } from "../models/Quest.js";
import { QuestProgressModel } from "../models/QuestProgress.js";
import { UserModel } from "../models/User.js";
import { awardBadge } from "./awardBadge.js";

export function getWeekWindow(referenceDate = new Date()) {
  const start = new Date(referenceDate);
  const day = start.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  start.setUTCDate(start.getUTCDate() - diffToMonday);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return { weekStart: start, weekEnd: end };
}

export async function ensureWeeklyQuests(referenceDate = new Date()) {
  const { weekStart, weekEnd } = getWeekWindow(referenceDate);
  const existing = await QuestModel.countDocuments({ weekStart, isActive: true });
  if (existing > 0) return;

  await QuestModel.create([
    {
      title: "Voracious Reader",
      description: "Read 5 stories or blogs this week",
      type: "read_posts",
      target: 5,
      xpReward: 50,
      weekStart,
      weekEnd,
    },
    {
      title: "Voice of the Week",
      description: "Leave 3 comments this week",
      type: "comment",
      target: 3,
      xpReward: 30,
      weekStart,
      weekEnd,
    },
    {
      title: "Community Builder",
      description: "Follow 2 new authors this week",
      type: "follow",
      target: 2,
      xpReward: 25,
      weekStart,
      weekEnd,
    },
  ]);
}

export async function progressQuest(userId, questType) {
  if (!userId || !questType) return [];
  const now = new Date();
  const quests = await QuestModel.find({
    type: questType,
    isActive: true,
    weekEnd: { $gt: now },
  });
  if (quests.length === 0) return [];

  const updated = [];
  for (const quest of quests) {
    const progress = await QuestProgressModel.findOneAndUpdate(
      { user: userId, quest: quest._id },
      { $setOnInsert: { progress: 0, completed: false } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (progress.completed) {
      updated.push(progress);
      continue;
    }

    progress.progress = Math.min((progress.progress ?? 0) + 1, quest.target);
    if (progress.progress >= quest.target) {
      progress.completed = true;
      progress.completedAt = new Date();
      if (quest.xpReward > 0) {
        await UserModel.findByIdAndUpdate(userId, { $inc: { xp: quest.xpReward } });
      }
      if (quest.badgeReward) await awardBadge(userId, quest.badgeReward);
    }
    await progress.save();
    updated.push(progress);
  }

  return updated;
}
