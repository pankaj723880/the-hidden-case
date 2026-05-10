import cron from "node-cron";
import { PostModel } from "./models/Post.js";
import { getIo } from "./socketState.js";
import { isMongoConnected } from "./db/mongoose.js";
import { recalculateMonthlyLeaderboard } from "./utils/leaderboard.js";
import { ensureWeeklyQuests } from "./utils/quests.js";
import { deleteCache } from "./utils/cache.js";
import { UserModel } from "./models/User.js";
import { CommentModel } from "./models/Comment.js";
import { NotificationModel } from "./models/Notification.js";
import { MessageModel } from "./models/Message.js";
import { KudosModel } from "./models/Kudos.js";

let schedulerStarted = false;

export function initScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  cron.schedule("* * * * *", async () => {
    if (!isMongoConnected()) return;

    const duePosts = await PostModel.find({
      status: "scheduled",
      scheduledAt: { $lte: new Date() },
    }).populate("author", "name avatar");

    const io = getIo();

    for (const post of duePosts) {
      post.status = "published";
      post.scheduledAt = null;
      await post.save();
      io?.emit("new_post", { post });
    }
  });

  cron.schedule("0 * * * *", async () => {
    if (!isMongoConnected()) return;

    const posts = await PostModel.find({
      status: { $in: ["approved", "published"] },
    }).select("_id views likes");

    if (posts.length === 0) return;

    await PostModel.bulkWrite(
      posts.map((post) => ({
        updateOne: {
          filter: { _id: post._id },
          update: {
            $set: {
              weeklyScore: (post.views ?? 0) + ((post.likes ?? []).length * 3),
            },
          },
        },
      })),
    );
    await deleteCache("posts:trending");
  });

  cron.schedule("0 0 * * 0", async () => {
    if (!isMongoConnected()) return;

    await PostModel.updateMany({}, { $set: { weeklyScore: 0 } });
  });

  cron.schedule("0 0 1 * *", async () => {
    if (!isMongoConnected()) return;

    await recalculateMonthlyLeaderboard();
    await deleteCache("leaderboard");
  });

  cron.schedule("0 0 * * 1", async () => {
    if (!isMongoConnected()) return;
    await ensureWeeklyQuests();
  });

  cron.schedule("0 2 * * *", async () => {
    if (!isMongoConnected()) return;

    const users = await UserModel.find({
      deletionScheduledFor: { $lte: new Date() },
    }).select("_id");

    for (const user of users) {
      const userId = user._id;
      await Promise.all([
        PostModel.deleteMany({ author: userId }),
        CommentModel.deleteMany({ author: userId }),
        NotificationModel.deleteMany({ recipient: userId }),
        MessageModel.deleteMany({ $or: [{ from: userId }, { to: userId }] }),
        KudosModel.deleteMany({ $or: [{ from: userId }, { to: userId }] }),
      ]);
      await UserModel.deleteOne({ _id: userId });
    }
  });

  cron.schedule("0 * * * *", async () => {
    if (!isMongoConnected()) return;
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const posts = await PostModel.find({
      "titleTest.variantB": { $ne: null },
      "titleTest.startedAt": { $lte: cutoff },
      "titleTest.winner": null,
    });

    for (const post of posts) {
      const a = post.titleTest?.clicks?.variantA ?? 0;
      const b = post.titleTest?.clicks?.variantB ?? 0;
      const winner = b > a ? "B" : "A";
      post.titleTest.winner = winner;
      if (winner === "B" && post.titleTest.variantB) {
        post.title = post.titleTest.variantB;
      }
      await post.save();
    }
  });
}
