import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/isAdmin.js";
import {
  getAllPostsForAdmin,
  patchPostStatus,
  getAllUsers,
  deleteUser,
  getAnalytics,
  getEvents,
  toggleFeaturedPost,
  getAuditLog,
  getPlagiarismReports,
  updatePlagiarismReport,
  getSuspiciousActivity,
  updateSuspiciousActivity,
} from "../controllers/adminController.js";

export const adminRouter = Router();

adminRouter.get("/posts", requireAuth, requireAdmin, getAllPostsForAdmin);
adminRouter.patch(
  "/posts/:id/status",
  requireAuth,
  requireAdmin,
  patchPostStatus,
);
adminRouter.post(
  "/posts/:id/feature",
  requireAuth,
  requireAdmin,
  toggleFeaturedPost,
);

adminRouter.get("/users", requireAuth, requireAdmin, getAllUsers);
adminRouter.delete("/users/:id", requireAuth, requireAdmin, deleteUser);

adminRouter.get("/analytics", requireAuth, requireAdmin, getAnalytics);
adminRouter.get("/events", requireAuth, requireAdmin, getEvents);
adminRouter.get("/audit-log", requireAuth, requireAdmin, getAuditLog);
adminRouter.get(
  "/plagiarism-reports",
  requireAuth,
  requireAdmin,
  getPlagiarismReports,
);
adminRouter.patch(
  "/plagiarism-reports/:id",
  requireAuth,
  requireAdmin,
  updatePlagiarismReport,
);
adminRouter.get(
  "/suspicious-activity",
  requireAuth,
  requireAdmin,
  getSuspiciousActivity,
);
adminRouter.patch(
  "/suspicious-activity/:id",
  requireAuth,
  requireAdmin,
  updateSuspiciousActivity,
);
