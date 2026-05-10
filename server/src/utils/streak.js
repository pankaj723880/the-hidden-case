import { UserModel } from "../models/User.js";

export async function updateStreak(userId) {
  const user = await UserModel.findById(userId);
  if (!user) return null;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (!user.lastWrittenAt) {
    user.currentStreak = 1;
    user.lastWrittenAt = today;
  } else {
    const lastDate = new Date(user.lastWrittenAt);
    lastDate.setUTCHours(0, 0, 0, 0);
    const diff = Math.floor((today - lastDate) / 86400000);

    if (diff === 0) {
      return user;
    }
    if (diff === 1) {
      user.currentStreak = (user.currentStreak ?? 0) + 1;
    } else {
      user.currentStreak = 1;
    }

    user.lastWrittenAt = today;
  }

  if ((user.currentStreak ?? 0) > (user.longestStreak ?? 0)) {
    user.longestStreak = user.currentStreak;
  }

  await user.save();
  return user;
}
