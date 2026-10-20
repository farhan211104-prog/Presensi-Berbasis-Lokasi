import { Router } from "express";

const router = Router();

// Endpoint pengecekan status server
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    waktu: new Date().toISOString(),
  });
});

export default router;
