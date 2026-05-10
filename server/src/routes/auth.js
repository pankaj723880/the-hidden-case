import { Router } from "express";
import {
  login,
  loginTwoFactor,
  googleLogin,
  logout,
  logoutAll,
  refresh,
  register,
  setupTwoFactor,
  verifyTwoFactorSetup,
  disableTwoFactor,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/google", googleLogin);
authRouter.post("/2fa/setup", requireAuth, setupTwoFactor);
authRouter.post("/2fa/verify-setup", requireAuth, verifyTwoFactorSetup);
authRouter.post("/2fa/disable", requireAuth, disableTwoFactor);
authRouter.post("/2fa/login", loginTwoFactor);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);
authRouter.post("/logout-all", logoutAll);
