import { Router } from "express";
import mongoose from "mongoose";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { GroupModel } from "../models/Group.js";
import { PostModel } from "../models/Post.js";
import { createNotification } from "../utils/notify.js";

export const groupsRouter = Router();

function isMember(group, userId) {
  return (group.members ?? []).some((id) => String(id?._id ?? id) === String(userId));
}

function isOwner(group, userId) {
  return String(group.owner?._id ?? group.owner) === String(userId);
}

function serializeGroup(group, userId) {
  const members = group.members ?? [];
  const joinRequests = group.joinRequests ?? [];
  return {
    ...group,
    memberCount: members.length,
    isMember: Boolean(userId) && isMember(group, userId),
    isOwner: Boolean(userId) && isOwner(group, userId),
    hasRequested:
      Boolean(userId) &&
      joinRequests.some((id) => String(id?._id ?? id) === String(userId)),
  };
}

async function recentPosts(groupId) {
  return PostModel.find({
    group: groupId,
    status: { $in: ["approved", "published"] },
  })
    .populate("author", "name avatar")
    .populate("coAuthors", "name avatar")
    .sort({ createdAt: -1 })
    .limit(6)
    .lean({ virtuals: true });
}

groupsRouter.get("/", optionalAuth, async (req, res) => {
  const groups = await GroupModel.find({ isPrivate: false })
    .populate("owner", "name avatar")
    .populate("members", "name avatar")
    .sort({ createdAt: -1 })
    .lean();

  groups.sort((a, b) => (b.members?.length ?? 0) - (a.members?.length ?? 0));

  return res.json({
    groups: groups.map((group) => serializeGroup(group, req.user?.id)),
  });
});

groupsRouter.get("/mine", requireAuth, async (req, res) => {
  const groups = await GroupModel.find({ members: req.user.id })
    .populate("owner", "name avatar")
    .populate("members", "name avatar")
    .sort({ name: 1 })
    .lean();

  return res.json({
    groups: groups.map((group) => serializeGroup(group, req.user.id)),
  });
});

groupsRouter.get("/:id", optionalAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "Group not found" });
  }

  const group = await GroupModel.findById(req.params.id)
    .populate("owner", "name avatar email")
    .populate("members", "name avatar")
    .populate("joinRequests", "name avatar email")
    .lean();

  if (!group) return res.status(404).json({ error: "Group not found" });

  return res.json({
    group: {
      ...serializeGroup(group, req.user?.id),
      recentPosts: group.isPrivate && !isMember(group, req.user?.id)
        ? []
        : await recentPosts(group._id),
    },
  });
});

groupsRouter.post("/", requireAuth, async (req, res) => {
  const name = String(req.body.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "Group name is required" });

  const group = await GroupModel.create({
    name,
    description: String(req.body.description ?? "").trim(),
    coverImage: String(req.body.coverImage ?? "").trim(),
    owner: req.user.id,
    members: [req.user.id],
    isPrivate: Boolean(req.body.isPrivate),
  });

  return res.status(201).json({ group: serializeGroup(group.toObject(), req.user.id) });
});

groupsRouter.put("/:id", requireAuth, async (req, res) => {
  const group = await GroupModel.findById(req.params.id);
  if (!group) return res.status(404).json({ error: "Group not found" });
  if (!isOwner(group, req.user.id)) {
    return res.status(403).json({ error: "Only the group owner can edit this group" });
  }

  if (typeof req.body.name === "string" && req.body.name.trim()) {
    group.name = req.body.name.trim();
  }
  if (typeof req.body.description === "string") {
    group.description = req.body.description.trim();
  }
  if (typeof req.body.coverImage === "string") {
    group.coverImage = req.body.coverImage.trim();
  }
  if (typeof req.body.isPrivate === "boolean") group.isPrivate = req.body.isPrivate;

  await group.save();
  return res.json({ group: serializeGroup(group.toObject(), req.user.id) });
});

groupsRouter.post("/:id/join", requireAuth, async (req, res) => {
  const group = await GroupModel.findById(req.params.id);
  if (!group) return res.status(404).json({ error: "Group not found" });

  if (isMember(group, req.user.id)) return res.json({ joined: true });

  if (!group.isPrivate) {
    group.members.push(req.user.id);
    await group.save();
    return res.json({ joined: true });
  }

  if (!group.joinRequests.some((id) => String(id) === String(req.user.id))) {
    group.joinRequests.push(req.user.id);
    await group.save();
    await createNotification({
      recipient: group.owner,
      type: "group_join_request",
      actor: req.user.id,
    });
  }

  return res.json({ requested: true });
});

groupsRouter.post("/:id/approve/:userId", requireAuth, async (req, res) => {
  const group = await GroupModel.findById(req.params.id);
  if (!group) return res.status(404).json({ error: "Group not found" });
  if (!isOwner(group, req.user.id)) return res.status(403).json({ error: "Owner only" });

  group.joinRequests = group.joinRequests.filter(
    (id) => String(id) !== String(req.params.userId),
  );
  if (!isMember(group, req.params.userId)) group.members.push(req.params.userId);
  await group.save();

  return res.json({ group: serializeGroup(group.toObject(), req.user.id) });
});

groupsRouter.post("/:id/decline/:userId", requireAuth, async (req, res) => {
  const group = await GroupModel.findById(req.params.id);
  if (!group) return res.status(404).json({ error: "Group not found" });
  if (!isOwner(group, req.user.id)) return res.status(403).json({ error: "Owner only" });

  group.joinRequests = group.joinRequests.filter(
    (id) => String(id) !== String(req.params.userId),
  );
  await group.save();

  return res.json({ ok: true });
});

groupsRouter.delete("/:id/members/:userId", requireAuth, async (req, res) => {
  const group = await GroupModel.findById(req.params.id);
  if (!group) return res.status(404).json({ error: "Group not found" });
  if (!isOwner(group, req.user.id)) return res.status(403).json({ error: "Owner only" });

  if (String(group.owner) === String(req.params.userId)) {
    return res.status(400).json({ error: "Owner cannot be removed" });
  }

  group.members = group.members.filter((id) => String(id) !== String(req.params.userId));
  await group.save();

  return res.json({ ok: true });
});

groupsRouter.post("/:id/leave", requireAuth, async (req, res) => {
  const group = await GroupModel.findById(req.params.id);
  if (!group) return res.status(404).json({ error: "Group not found" });
  if (isOwner(group, req.user.id)) {
    return res.status(400).json({ error: "Owner cannot leave their own group" });
  }

  group.members = group.members.filter((id) => String(id) !== String(req.user.id));
  await group.save();

  return res.json({ left: true });
});

groupsRouter.get("/:id/posts", optionalAuth, async (req, res) => {
  const group = await GroupModel.findById(req.params.id).lean();
  if (!group) return res.status(404).json({ error: "Group not found" });
  if (group.isPrivate && !isMember(group, req.user?.id)) {
    return res.status(403).json({ error: "Members only" });
  }

  const posts = await PostModel.find({
    group: req.params.id,
    status: { $in: ["approved", "published"] },
  })
    .populate("author", "name avatar")
    .populate("coAuthors", "name avatar")
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });

  return res.json({ posts });
});
