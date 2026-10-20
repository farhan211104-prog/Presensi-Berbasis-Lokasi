import express from "express";
import cors from "cors";
import { FRONTEND_ORIGIN } from "./config/env.js";
import { initSchema } from "./db/schema.js";
import authRoutes from "./routes/authRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import jadwalRoutes from "./routes/jadwalRoutes.js";
import presensiRoutes from "./routes/presensiRoutes.js";
import wajahRoutes from "./routes/wajahRoutes.js";
import mataKuliahRoutes from "./routes/mataKuliahRoutes.js";
import rekapRoutes from "./routes/rekapRoutes.js";
import nilaiRoutes from "./routes/nilaiRoutes.js";
import devRoutes from "./routes/devRoutes.js";
import { IS_DEV } from "./config/env.js";
import { initUploadDirs } from "./utils/upload.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

// Inisialisasi skema tabel database dan direktori upload secara otomatis saat server dimuat
initSchema();
initUploadDirs();

const app = express();

// Konfigurasi CORS: hanya mengizinkan origin dari frontend
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware parsing JSON body
app.use(express.json());

// Rute API Utama
app.use("/api/auth", authRoutes);
app.use("/api/jadwal", jadwalRoutes);
app.use("/api/presensi", presensiRoutes);
app.use("/api/wajah", wajahRoutes);
app.use("/api/mata-kuliah", mataKuliahRoutes);
app.use("/api/rekap", rekapRoutes);
app.use("/api/nilai", nilaiRoutes);
app.use("/api", healthRoutes);

// Rute khusus mode development (HANYA didaftarkan jika IS_DEV aktif)
if (IS_DEV) {
  app.use("/api/dev", devRoutes);
}


// Penanganan rute 404 jika tidak cocok dengan endpoint manapun
app.use(notFoundHandler);

// Middleware penanganan error terpusat
app.use(errorHandler);

export default app;
