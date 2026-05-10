import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { NotificationModel } from "../models/Notification.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, async (req, res) => {
  const notifications = await NotificationModel.find({ recipient: req.user.id })
    .populate("actor", "name avatar")
    .populate("post", "title")
    .populate("comment", "text")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return res.json({ notifications });
});

notificationsRouter.patch("/read-all", requireAuth, async (req, res) => {
  await NotificationModel.updateMany(
    { recipient: req.user.id },
    { $set: { read: true } },
  );

  return res.json({ ok: true });
});

notificationsRouter.patch("/:id/read", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "Notification not found" });
  }

  const notification = await NotificationModel.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user.id },
    { $set: { read: true } },
    { new: true },
  )
    .populate("actor", "name avatar")
    .populate("post", "title")
    .populate("comment", "text")
    .lean();

  if (!notification) {
    return res.status(404).json({ error: "Notification not found" });
  }

  return res.json({ notification });
});

notificationsRouter.delete("/:id", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "Notification not found" });
  }

  await NotificationModel.deleteOne({
    _id: req.params.id,
    recipient: req.user.id,
  });

  return res.json({ ok: true });
});
