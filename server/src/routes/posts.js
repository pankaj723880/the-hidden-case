import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/isAdmin.js";
import { coverUpload, mediaUpload } from "../middleware/upload.js";
import {
  deletePost,
  getAllPosts,
  checkPostPlagiarismForAdmin,
  getApprovedPosts,
  getPersonalizedFeed,
  getPostById,
  setPostStatus,
  toggleLike,
  uploadCover,
  uploadInlineImage,
  generatePostCover,
  createPendingPost,
  updatePost,
  getMyPosts,
  getDraftPosts,
  submitPost,
  uploadPostMedia,
  getTrendingPosts,
  getRelatedPosts,
  getNextRead,
  getNextReadReason,
  getFeaturedPosts,
  getPostCritique,
  suggestPostTags,
  trackReadDepth,
  trackPostSource,
  startTitleTest,
  trackTitleClick,
  translatePost,
  inviteCoAuthor,
  acceptCoAuthorInvite,
  declineCoAuthorInvite,
  removeCoAuthor,
} from "../controllers/postController.js";

export const postsRouter = Router();

function requireWriter(req, res, next) {
  if (req.user?.role === "admin") {
    return res
      .status(403)
      .json({ error: "Admins cannot create or submit stories or blogs" });
  }
  return next();
}

// Admin routes must be declared before /:id.
postsRouter.get("/admin/all", requireAuth, requireAdmin, getAllPosts);
postsRouter.patch(
  "/admin/:id/status",
  requireAuth,
  requireAdmin,
  setPostStatus,
);
postsRouter.post(
  "/admin/:id/plagiarism-check",
  requireAuth,
  requireAdmin,
  checkPostPlagiarismForAdmin,
);

// Authenticated collection helpers
postsRouter.get("/mine", requireAuth, getMyPosts);
postsRouter.get("/drafts", requireAuth, getDraftPosts);
postsRouter.get("/feed", requireAuth, getPersonalizedFeed);
postsRouter.post(
  "/media",
  requireAuth,
  requireWriter,
  mediaUpload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  uploadPostMedia,
);
postsRouter.post(
  "/upload-image",
  requireAuth,
  requireWriter,
  coverUpload.single("image"),
  uploadInlineImage,
);
postsRouter.post("/suggest-tags", requireAuth, requireWriter, suggestPostTags);

// Public
postsRouter.get("/featured", getFeaturedPosts);
postsRouter.get("/trending", getTrendingPosts);
postsRouter.get("/", getApprovedPosts);
postsRouter.get("/:id/related", getRelatedPosts);
postsRouter.get("/:id/next-read", optionalAuth, getNextRead);
postsRouter.get("/:id/next-read-reason", optionalAuth, getNextReadReason);
postsRouter.get("/:id/critique", requireAuth, getPostCritique);
postsRouter.get("/:id", optionalAuth, getPostById);

// Authenticated (owner/admin logic handled later)
postsRouter.post("/", requireAuth, requireWriter, createPendingPost);
postsRouter.put("/:id", requireAuth, requireWriter, updatePost);
postsRouter.delete("/:id", requireAuth, deletePost);
postsRouter.post("/:id/submit", requireAuth, requireWriter, submitPost);
postsRouter.post("/:id/generate-cover", requireAuth, requireWriter, generatePostCover);
postsRouter.post("/:id/title-test", requireAuth, requireWriter, startTitleTest);
postsRouter.post("/:id/translate", requireAuth, translatePost);
postsRouter.post("/:id/invite-coauthor", requireAuth, requireWriter, inviteCoAuthor);
postsRouter.post("/:id/accept-coauthor", requireAuth, requireWriter, acceptCoAuthorInvite);
postsRouter.post("/:id/decline-coauthor", requireAuth, requireWriter, declineCoAuthorInvite);
postsRouter.delete(
  "/:id/coauthors/:userId",
  requireAuth,
  requireWriter,
  removeCoAuthor,
);

// Realtime-ish actions
postsRouter.post("/:id/like", requireAuth, toggleLike);
postsRouter.post("/:id/title-click", trackTitleClick);
postsRouter.post("/:id/read-depth", trackReadDepth);
postsRouter.post("/:id/track-source", trackPostSource);
postsRouter.post(
  "/:id/cover",
  requireAuth,
  coverUpload.single("file"),
  uploadCover,
);
