import { UserModel } from "../models/User.js";
import { createNotification } from "./notify.js";
import { getIo } from "../socketState.js";
import { BADGES } from "./badges.js";

export async function awardBadge(userId, badgeId) {
  if (!userId || !badgeId) return false;

  const badge = BADGES.find((item) => item.id === badgeId);
  if (!badge) return false;

  const user = await UserModel.findById(userId).select("badges");
  if (!user) return false;
  if ((user.badges ?? []).includes(badgeId)) return false;

  user.badges = [...(user.badges ?? []), badgeId];
  await user.save();

  await createNotification({
    recipient: user._id,
    type: "badge_earned",
  });

  getIo()?.to(`user:${user._id}`).emit("badge_earned", { badgeId, badge });
  return true;
}
