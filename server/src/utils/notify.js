import { NotificationModel } from "../models/Notification.js";
import { UserModel } from "../models/User.js";
import { getIo } from "../socketState.js";
import {
  sendNewCommentEmail,
  sendNewFollowerEmail,
  sendPostApprovedEmail,
  sendPostRejectedEmail,
} from "./email.js";

export async function createNotification({
  recipient,
  type,
  actor = null,
  post = null,
  comment = null,
}) {
  if (!recipient) return null;

  const recipientId = recipient.toString();
  const actorId = actor ? actor.toString() : null;
  if (actorId && recipientId === actorId) return null;

  const notification = await NotificationModel.create({
    recipient,
    type,
    actor,
    post,
    comment,
  });

  const populatedNotification = await NotificationModel.findById(notification._id)
    .populate("actor", "name avatar")
    .populate("post", "title")
    .populate("comment", "text")
    .lean();

  getIo()
    ?.to(`user:${recipientId}`)
    .emit("notification", populatedNotification);

  void sendNotificationEmail(populatedNotification).catch(() => {});

  return populatedNotification;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function parseMentions(text, currentUserId, postId, commentId = null) {
  if (typeof text !== "string" || !text.includes("@")) return;

  const plainText = text.replace(/<[^>]+>/g, " ");
  const mentionTokens = [
    ...new Set(
      [...plainText.matchAll(/@(\w+)/g)]
        .map((match) => match[1])
        .filter(Boolean),
    ),
  ];

  await Promise.all(
    mentionTokens.map(async (token) => {
      const namePattern = escapeRegExp(token).replace(/_/g, "[ _]+");
      const mentionedUser = await UserModel.findOne({
        name: { $regex: new RegExp(`^${namePattern}$`, "i") },
      }).select("_id");

      if (!mentionedUser) return;

      await createNotification({
        recipient: mentionedUser._id,
        type: "mention",
        actor: currentUserId,
        post: postId,
        comment: commentId,
      });
    }),
  );
}

async function sendNotificationEmail(notification) {
  const recipient = await UserModel.findById(notification.recipient).lean();
  if (!recipient || recipient.emailNotifications === false) return;

  const actor = notification.actor;
  const post = notification.post;

  if (notification.type === "comment" && actor && post) {
    await sendNewCommentEmail(recipient, actor, post, notification.comment?.text ?? "");
  }
  if (notification.type === "follow" && actor) {
    await sendNewFollowerEmail(recipient, actor);
  }
  if (notification.type === "post_approved" && post) {
    await sendPostApprovedEmail(recipient, post);
  }
  if (notification.type === "post_rejected" && post) {
    await sendPostRejectedEmail(recipient, post);
  }
}
