import { UserModel } from "../models/User.js";
import { getIo } from "../socketState.js";

export const XP_ACTIONS = {
  post_published: 100,
  post_approved: 50,
  comment_received: 5,
  like_received: 2,
  follower_gained: 10,
  challenge_entered: 30,
  challenge_won: 500,
  coauthor_accepted: 80,
};

export const LEVELS = [
  { name: "Apprentice", minXP: 0, icon: "✒️" },
  { name: "Scribe", minXP: 200, icon: "📜" },
  { name: "Storyteller", minXP: 600, icon: "📖" },
  { name: "Chronicler", minXP: 1500, icon: "🗝️" },
  { name: "Wordsmith", minXP: 3000, icon: "⚡" },
  { name: "Master", minXP: 6000, icon: "🔮" },
  { name: "Legendary", minXP: 12000, icon: "👑" },
];

export async function awardXP(userId, action) {
  const xpGained = XP_ACTIONS[action];
  if (!userId || !xpGained) return null;

  const user = await UserModel.findById(userId).select("xp level");
  if (!user) return null;

  const oldLevel = user.level ?? "Apprentice";
  user.xp = (user.xp ?? 0) + xpGained;
  const nextLevel = [...LEVELS].reverse().find((level) => user.xp >= level.minXP);
  user.level = nextLevel?.name ?? oldLevel;
  await user.save();

  const leveledUp = user.level !== oldLevel;
  if (leveledUp) {
    getIo()
      ?.to(`user:${user._id}`)
      .emit("level_up", { newLevel: user.level, xpGained });
  }

  return {
    xpGained,
    newXP: user.xp,
    newLevel: user.level,
    leveledUp,
  };
}
