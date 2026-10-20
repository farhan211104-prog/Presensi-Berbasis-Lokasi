import { Router } from "express";
import { login, me } from "../controllers/authController.js";
import { authRequired } from "../middleware/auth.js";
import { loginRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// Endpoint autentikasi
router.post("/login", loginRateLimiter, login);
router.get("/me", authRequired, me);

export default router;
