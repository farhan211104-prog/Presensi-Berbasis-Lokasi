import app from "./app.js";
import {
  PORT,
  FRONTEND_ORIGIN,
  IS_DEV,
  DEV_IZINKAN_PRESENSI_ULANG,
  DEV_SESI_SELALU_BUKA,
} from "./config/env.js";

// Memulai server backend
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`Backend Server Portal Tel-U berjalan di Port: ${PORT}`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`CORS Diizinkan untuk: ${FRONTEND_ORIGIN}`);
  if (IS_DEV) {
    console.warn(`[PERINGATAN DEV] Server berjalan dalam MODE DEVELOPMENT.`);
    console.warn(
      `[PERINGATAN DEV] Flag aktif: DEV_IZINKAN_PRESENSI_ULANG=${DEV_IZINKAN_PRESENSI_ULANG}, DEV_SESI_SELALU_BUKA=${DEV_SESI_SELALU_BUKA}.`
    );
    console.warn(
      `[PERINGATAN DEV] Endpoint /api/dev/* aktif untuk simulasi waktu & reset.`
    );
  }
  console.log(`====================================================`);
});

