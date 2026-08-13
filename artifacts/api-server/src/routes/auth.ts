import { Router } from "express";
import rateLimit from "express-rate-limit";
import { AuthController } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { validateBody } from "../middlewares/validate.js";
import { LoginSchema, ForgotPasswordSchema, ResetPasswordSchema } from "../validators/auth.validator.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
    },
  },
});

// T-003 — Rate limit dedicado para recuperação de senha
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Muitas solicitações de recuperação de senha. Tente novamente em 15 minutos.",
    },
  },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Muitas tentativas de redefinição de senha. Tente novamente em 15 minutos.",
    },
  },
});

router.post("/auth/login", loginLimiter, validateBody(LoginSchema), AuthController.login);
router.post(
  "/auth/forgot-password",
  forgotPasswordLimiter,
  validateBody(ForgotPasswordSchema),
  AuthController.forgotPassword,
);
router.post(
  "/auth/reset-password",
  resetPasswordLimiter,
  validateBody(ResetPasswordSchema),
  AuthController.resetPassword,
);
router.post("/auth/logout", requireAuth, AuthController.logout);
router.get("/auth/me", requireAuth, AuthController.me);

export default router;
