import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import {
  getCommentsForPost,
  addComment,
  addReply,
  reactToComment,
  deleteComment,
} from "../controllers/commentController.js";

export const commentsRouter = Router();

commentsRouter.get("/post/:postId", optionalAuth, getCommentsForPost);
commentsRouter.post("/post/:postId", requireAuth, addComment);
commentsRouter.post("/post/:postId/reply/:commentId", requireAuth, addReply);
commentsRouter.post("/:commentId/react", requireAuth, reactToComment);
commentsRouter.delete("/:id", requireAuth, deleteComment);
