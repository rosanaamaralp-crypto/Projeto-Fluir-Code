import { Router } from "express";
import rateLimit from "express-rate-limit";
import { AuthController } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { validateBody } from "../middlewares/validate.js";
import { LoginSchema } from "../validators/auth.validator.js";

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

router.post("/auth/login", loginLimiter, validateBody(LoginSchema), AuthController.login);
router.post("/auth/logout", requireAuth, AuthController.logout);
router.get("/auth/me", requireAuth, AuthController.me);

export default router;
