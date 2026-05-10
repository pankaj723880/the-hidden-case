import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { MessageModel } from "../models/Message.js";
import { UserModel } from "../models/User.js";
import { getIo } from "../socketState.js";

export const messagesRouter = Router();

function publicUser(user) {
  if (!user) return null;
  return {
    _id: user._id,
    id: user._id.toString(),
    name: user.name,
    avatar: user.avatar,
  };
}

function isBlockedBy(user, otherUserId) {
  return (user?.blockedUsers ?? []).some((id) => String(id) === String(otherUserId));
}

function serializeMessage(message, currentUserId) {
  const serialized = {
    ...message,
    text: message.deleted ? "" : message.text,
    userReaction:
      (message.reactions ?? []).find(
        (reaction) => String(reaction.user?._id ?? reaction.user) === String(currentUserId),
      )?.emoji ?? null,
  };
  return serialized;
}

function conversationFilter(userId, partnerId) {
  return {
    $or: [
      { sender: userId, recipient: partnerId },
      { sender: partnerId, recipient: userId },
    ],
    hiddenFor: { $ne: userId },
  };
}

messagesRouter.get("/conversations", requireAuth, async (req, res) => {
  const currentUserId = req.user.id;
  const messages = await MessageModel.find({
    $or: [{ sender: currentUserId }, { recipient: currentUserId }],
    hiddenFor: { $ne: currentUserId },
  })
    .select("sender recipient text read deleted reactions createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const conversationsByPartner = new Map();

  for (const message of messages) {
    const senderId = message.sender.toString();
    const recipientId = message.recipient.toString();
    const partnerId = senderId === currentUserId ? recipientId : senderId;
    const existing = conversationsByPartner.get(partnerId);

    if (!existing) {
      conversationsByPartner.set(partnerId, {
        partnerId,
        lastMessage: message,
        unreadCount: 0,
      });
    }

    if (recipientId === currentUserId && !message.read) {
      conversationsByPartner.get(partnerId).unreadCount += 1;
    }
  }

  const partnerIds = [...conversationsByPartner.keys()];
  const users = await UserModel.find({ _id: { $in: partnerIds } })
    .select("name avatar")
    .lean();
  const usersById = new Map(users.map((user) => [user._id.toString(), user]));

  const conversations = [...conversationsByPartner.values()]
    .map((conversation) => ({
      user: publicUser(usersById.get(conversation.partnerId)),
      lastMessage: conversation.lastMessage,
      unreadCount: conversation.unreadCount,
    }))
    .filter((conversation) => conversation.user)
    .sort(
      (a, b) =>
        new Date(b.lastMessage.createdAt).getTime() -
        new Date(a.lastMessage.createdAt).getTime(),
    );

  return res.json({ conversations });
});

messagesRouter.get("/messages/:userId", requireAuth, async (req, res) => {
  const currentUserId = req.user.id;
  const partnerId = req.params.userId;

  if (!mongoose.isValidObjectId(partnerId)) {
    return res.status(404).json({ error: "User not found" });
  }

  const partner = await UserModel.findById(partnerId).select("_id");
  if (!partner) return res.status(404).json({ error: "User not found" });

  await MessageModel.updateMany(
    { sender: partnerId, recipient: currentUserId, read: false },
    { $set: { read: true } },
  );

  const messages = await MessageModel.find(conversationFilter(currentUserId, partnerId))
    .populate("sender", "name avatar")
    .sort({ createdAt: 1 })
    .lean();

  return res.json({ messages: messages.map((message) => serializeMessage(message, currentUserId)) });
});

messagesRouter.post("/messages/:userId", requireAuth, async (req, res) => {
  const currentUserId = req.user.id;
  const partnerId = req.params.userId;
  const text = String(req.body.text ?? "").trim();

  if (!mongoose.isValidObjectId(partnerId)) {
    return res.status(404).json({ error: "User not found" });
  }
  if (currentUserId === partnerId) {
    return res.status(400).json({ error: "You cannot message yourself" });
  }
  if (!text) return res.status(400).json({ error: "Message text is required" });
  if (text.length > 1000) {
    return res.status(400).json({ error: "Message must be 1000 characters or less" });
  }

  const [sender, recipient] = await Promise.all([
    UserModel.findById(currentUserId).select("blockedUsers"),
    UserModel.findById(partnerId).select("_id blockedUsers"),
  ]);
  if (!recipient) return res.status(404).json({ error: "User not found" });
  if (isBlockedBy(sender, partnerId)) {
    return res.status(403).json({ error: "Unblock this user before messaging them" });
  }
  if (isBlockedBy(recipient, currentUserId)) {
    return res.status(403).json({ error: "You cannot message this user" });
  }

  const created = await MessageModel.create({
    sender: currentUserId,
    recipient: partnerId,
    text,
  });
  const message = await MessageModel.findById(created._id)
    .populate("sender", "name avatar")
    .lean();

  getIo()?.to(`user:${partnerId}`).emit("new_message", { message });

  return res.status(201).json({ message });
});

messagesRouter.delete("/messages/:messageId", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.messageId)) {
    return res.status(404).json({ error: "Message not found" });
  }

  const message = await MessageModel.findById(req.params.messageId);
  if (!message) return res.status(404).json({ error: "Message not found" });
  const mode = req.query.mode === "everyone" ? "everyone" : "me";
  const isParticipant =
    String(message.sender) === String(req.user.id) ||
    String(message.recipient) === String(req.user.id);
  if (!isParticipant) return res.status(403).json({ error: "Not allowed" });

  if (mode === "everyone") {
    if (String(message.sender) !== String(req.user.id)) {
      return res.status(403).json({ error: "You can only delete your own messages for everyone" });
    }
    message.deleted = true;
    message.deletedAt = new Date();
    message.text = "This message was deleted";
  } else if (!(message.hiddenFor ?? []).some((id) => String(id) === String(req.user.id))) {
    message.hiddenFor.push(req.user.id);
  }
  await message.save();

  const populated = await MessageModel.findById(message._id)
    .populate("sender", "name avatar")
    .lean();
  const payload = serializeMessage(populated, req.user.id);
  if (mode === "everyone") {
    getIo()?.to(`user:${message.recipient}`).emit("message_updated", { message: payload });
  }

  return res.json({ message: mode === "everyone" ? payload : null });
});

messagesRouter.post("/messages/:messageId/react", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.messageId)) {
    return res.status(404).json({ error: "Message not found" });
  }

  const allowedEmojis = ["❤️", "👍", "😂", "😮", "😢", "🙏"];
  const emoji = String(req.body.emoji ?? "");
  if (!allowedEmojis.includes(emoji)) {
    return res.status(400).json({ error: "Invalid reaction" });
  }

  const message = await MessageModel.findOne({
    _id: req.params.messageId,
    $or: [{ sender: req.user.id }, { recipient: req.user.id }],
  });
  if (!message) return res.status(404).json({ error: "Message not found" });

  const existingIndex = (message.reactions ?? []).findIndex(
    (reaction) => String(reaction.user) === String(req.user.id),
  );
  if (existingIndex >= 0 && message.reactions[existingIndex].emoji === emoji) {
    message.reactions.splice(existingIndex, 1);
  } else if (existingIndex >= 0) {
    message.reactions[existingIndex].emoji = emoji;
    message.reactions[existingIndex].createdAt = new Date();
  } else {
    message.reactions.push({ user: req.user.id, emoji });
  }
  await message.save();

  const populated = await MessageModel.findById(message._id)
    .populate("sender", "name avatar")
    .lean();
  const senderPayload = serializeMessage(populated, message.sender);
  const recipientPayload = serializeMessage(populated, message.recipient);
  getIo()?.to(`user:${message.sender}`).emit("message_updated", { message: senderPayload });
  getIo()?.to(`user:${message.recipient}`).emit("message_updated", { message: recipientPayload });

  return res.json({ message: serializeMessage(populated, req.user.id) });
});

messagesRouter.post("/messages/:userId/block", requireAuth, async (req, res) => {
  const currentUserId = req.user.id;
  const partnerId = req.params.userId;

  if (!mongoose.isValidObjectId(partnerId)) {
    return res.status(404).json({ error: "User not found" });
  }
  if (currentUserId === partnerId) {
    return res.status(400).json({ error: "You cannot block yourself" });
  }

  const user = await UserModel.findById(currentUserId).select("blockedUsers");
  const partner = await UserModel.findById(partnerId).select("_id");
  if (!user || !partner) return res.status(404).json({ error: "User not found" });

  const isBlocked = isBlockedBy(user, partnerId);
  user.blockedUsers = isBlocked
    ? user.blockedUsers.filter((id) => String(id) !== String(partnerId))
    : [...(user.blockedUsers ?? []), partnerId];
  await user.save();

  return res.json({ blocked: !isBlocked });
});

messagesRouter.delete("/messages/conversation/:userId", requireAuth, async (req, res) => {
  const currentUserId = req.user.id;
  const partnerId = req.params.userId;

  if (!mongoose.isValidObjectId(partnerId)) {
    return res.status(404).json({ error: "User not found" });
  }

  await MessageModel.updateMany(
    conversationFilter(currentUserId, partnerId),
    { $addToSet: { hiddenFor: currentUserId } },
  );

  return res.json({ ok: true });
});
