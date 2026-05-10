import { PostModel } from "../models/Post.js";
import { CritiqueModel } from "../models/Critique.js";
import { generateCritique } from "../utils/generateCritique.js";
import { detectMood } from "../utils/detectMood.js";
import { suggestTags } from "../utils/suggestTags.js";
import {
  sendNewCommentEmail,
  sendNewFollowerEmail,
  sendPostApprovedEmail,
  sendPostRejectedEmail,
  sendWelcomeEmail,
} from "../utils/email.js";
import { aiQueue, emailQueue, pdfQueue, queues } from "./index.js";

let workersStarted = false;

export function initWorkers() {
  if (workersStarted) return;
  workersStarted = true;

  emailQueue?.process(3, async (job) => {
    const { type, data } = job.data ?? {};
    if (type === "welcome") return sendWelcomeEmail(data.user);
    if (type === "comment")
      return sendNewCommentEmail(data.author, data.commenter, data.post, data.text);
    if (type === "approved") return sendPostApprovedEmail(data.author, data.post);
    if (type === "rejected") return sendPostRejectedEmail(data.author, data.post);
    if (type === "follower") return sendNewFollowerEmail(data.user, data.follower);
    return null;
  });

  aiQueue?.process(2, async (job) => {
    const { type, postId, title, content, postType } = job.data ?? {};
    if (type === "tags") return suggestTags(title, content, postType);

    const post = await PostModel.findById(postId).populate("author", "name");
    if (!post) return null;

    if (type === "critique") {
      const critiqueData = await generateCritique(post);
      if (critiqueData) {
        return CritiqueModel.findOneAndUpdate(
          { post: post._id },
          { post: post._id, author: post.author?._id ?? post.author, ...critiqueData },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      }
    }

    if (type === "mood") {
      const mood = await detectMood(post.title, post.content);
      if (mood) return PostModel.findByIdAndUpdate(post._id, { mood });
    }

    return null;
  });

  pdfQueue?.process(1, async () => null);

  for (const queue of queues) {
    queue.on("failed", (job, error) => {
      console.error(`${queue.name} job ${job?.id ?? ""} failed:`, error.message);
    });
  }
}
