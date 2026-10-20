import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Pastikan membaca .env dari root backend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const PORT = process.env.PORT || 3000;
export const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_telu_jwt_key";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";
export const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
export const DB_PATH = process.env.DB_PATH || "./data/app.db";

// Konfigurasi Zona Waktu & Waktu Presensi
export const ZONA_WAKTU = process.env.ZONA_WAKTU || "Asia/Jakarta";
export const TOLERANSI_TERLAMBAT_MENIT = parseInt(process.env.TOLERANSI_TERLAMBAT_MENIT || "15", 10);
export const PRESENSI_BUKA_SEBELUM_MENIT = parseInt(process.env.PRESENSI_BUKA_SEBELUM_MENIT || "15", 10);
export const MAX_AKURASI_METER = parseInt(process.env.MAX_AKURASI_METER || "100", 10);

// Tanggal awal perkuliahan semester ganjil 2026/2027 (Minggu ke-1)
export const TANGGAL_MULAI_SEMESTER = process.env.TANGGAL_MULAI_SEMESTER || "2026-08-24";

// Environment mode
export const NODE_ENV = process.env.NODE_ENV || "development";
export const IS_DEV = NODE_ENV !== "production";

// Flag mode development (HANYA aktif jika NODE_ENV !== "production")
// Di production, semua flag dev wajib false
export const DEV_IZINKAN_PRESENSI_ULANG = IS_DEV && (
  process.env.DEV_IZINKAN_PRESENSI_ULANG !== undefined
    ? process.env.DEV_IZINKAN_PRESENSI_ULANG === "true"
    : true
);

export const DEV_SESI_SELALU_BUKA = IS_DEV && (
  process.env.DEV_SESI_SELALU_BUKA !== undefined
    ? process.env.DEV_SESI_SELALU_BUKA === "true"
    : true
);

// Konfigurasi Biometrik Wajah & Upload Foto (Tahap 4)
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(__dirname, "../../", process.env.UPLOAD_DIR)
  : path.resolve(__dirname, "../../uploads");
export const MAX_FOTO_MB = parseInt(process.env.MAX_FOTO_MB || "2", 10);
export const JUMLAH_SAMPLE_WAJAH = parseInt(process.env.JUMLAH_SAMPLE_WAJAH || "3", 10);
export const WAJIB_DAFTAR_WAJAH = process.env.WAJIB_DAFTAR_WAJAH !== undefined
  ? process.env.WAJIB_DAFTAR_WAJAH === "true"
  : true;
export const FACE_THRESHOLD = parseFloat(process.env.FACE_THRESHOLD || "0.8");

