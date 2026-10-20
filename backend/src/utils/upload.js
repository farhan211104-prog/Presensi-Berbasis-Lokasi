// ============================================================================
// UTILITAS UPLOAD FILE, VALIDASI MAGIC BYTES & PENGELOLAAN DIREKTORI
// Memvalidasi format biner gambar secara ketat dan mencegah path traversal
// ============================================================================

import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { UPLOAD_DIR, MAX_FOTO_MB } from "../config/env.js";

/**
 * Fungsi murni untuk mendeteksi tipe gambar berdasarkan Magic Bytes (signature biner file).
 * Menjamin file benar-benar gambar asli (JPEG atau PNG), bukan file teks/eksekusi
 * yang hanya dipalsukan ekstensinya.
 *
 * @param {Buffer} buffer - Buffer konten file
 * @returns {{ mime: string, ext: string } | null}
 */
export function deteksiTipeGambar(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 4) {
    return null;
  }

  // 1. JPEG Magic Bytes: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg", ekstensi: "jpg" };
  }

  // 2. PNG Magic Bytes: 89 50 4E 47 (\x89PNG)
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { mime: "image/png", ext: "png", ekstensi: "png" };
  }

  return null;
}

/**
 * Memastikan direktori upload utama dan subdirektori telah dibuat di disk
 *
 * @param {string} baseDir - Path folder dasar upload
 */
export function initUploadDirs(baseDir = UPLOAD_DIR) {
  try {
    fs.mkdirSync(path.resolve(baseDir, "wajah-sample"), { recursive: true });
    fs.mkdirSync(path.resolve(baseDir, "presensi"), { recursive: true });
  } catch (err) {
    console.error("Gagal membuat direktori upload:", err.message);
  }
}

/**
 * Menyimpan buffer foto sample wajah ke disk dengan nama file UUID acak
 * dan struktur uploads/wajah-sample/<userId>/<uuid>.<ext>
 *
 * Mendukung pemanggilan simpanSampleWajah({ buffer, userId }) maupun simpanSampleWajah(buffer, userId)
 */
export function simpanSampleWajah(arg1, arg2) {
  let buffer;
  let userId;
  let baseDir = UPLOAD_DIR;

  if (Buffer.isBuffer(arg1)) {
    buffer = arg1;
    userId = arg2;
  } else if (arg1 && typeof arg1 === "object") {
    buffer = arg1.buffer;
    userId = arg1.userId;
    if (arg1.baseDir) baseDir = arg1.baseDir;
  }

  const tipe = deteksiTipeGambar(buffer);
  if (!tipe) {
    throw new Error("File bukan gambar JPEG atau PNG yang valid.");
  }

  // Cegah path traversal dengan membersihkan userId
  const safeUserId = String(userId || "umum").replace(/[^a-zA-Z0-9_-]/g, "");
  const targetDir = path.resolve(baseDir, "wajah-sample", safeUserId);
  fs.mkdirSync(targetDir, { recursive: true });

  const filename = `${crypto.randomUUID()}.${tipe.ext}`;
  const targetFilePath = path.resolve(targetDir, filename);

  fs.writeFileSync(targetFilePath, buffer);

  const relPath = `wajah-sample/${safeUserId}/${filename}`;
  return {
    relPath,
    fullPath: targetFilePath,
    toString: () => relPath,
  };
}

/**
 * Menyimpan buffer foto presensi ke disk dengan nama file UUID acak
 * dan struktur uploads/presensi/<tahun-bulan>/<uuid>.<ext>
 *
 * Mendukung pemanggilan simpanFotoPresensi({ buffer, tahunBulan }) maupun simpanFotoPresensi(buffer, ext)
 */
export function simpanFotoPresensi(arg1, arg2) {
  let buffer;
  let periode;
  let baseDir = UPLOAD_DIR;

  if (Buffer.isBuffer(arg1)) {
    buffer = arg1;
    periode = arg2;
  } else if (arg1 && typeof arg1 === "object") {
    buffer = arg1.buffer;
    periode = arg1.tahunBulan;
    if (arg1.baseDir) baseDir = arg1.baseDir;
  }

  const tipe = deteksiTipeGambar(buffer);
  if (!tipe) {
    throw new Error("File bukan gambar JPEG atau PNG yang valid.");
  }

  // Format tahunBulan (YYYY-MM)
  let safeTahunBulan = periode;
  if (!safeTahunBulan || typeof safeTahunBulan !== "string" || !/^\d{4}-\d{2}$/.test(safeTahunBulan)) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    safeTahunBulan = `${yyyy}-${mm}`;
  }

  const targetDir = path.resolve(baseDir, "presensi", safeTahunBulan);
  fs.mkdirSync(targetDir, { recursive: true });

  const filename = `${crypto.randomUUID()}.${tipe.ext}`;
  const targetFilePath = path.resolve(targetDir, filename);

  fs.writeFileSync(targetFilePath, buffer);

  const relPath = `presensi/${safeTahunBulan}/${filename}`;
  return {
    relPath,
    fullPath: targetFilePath,
    toString: () => relPath,
  };
}

/**
 * Menghapus file secara aman dari disk dengan proteksi path traversal
 *
 * @param {string} targetPath - Path file relatif atau absolut
 * @param {string} [baseDir] - Direktori dasar upload
 */
export function hapusFileAman(targetPath, baseDir = UPLOAD_DIR) {
  if (!targetPath || typeof targetPath !== "string") return;
  try {
    const resolvedPath = path.isAbsolute(targetPath)
      ? path.resolve(targetPath)
      : path.resolve(baseDir, targetPath);
    const resolvedBase = path.resolve(baseDir);

    // Pastikan file berada di dalam baseDir (proteksi path traversal)
    if (!resolvedPath.startsWith(resolvedBase)) {
      return;
    }

    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
    }
  } catch (err) {
    // Tidak mencatat path lengkap ke konsol untuk keamanan data sensitif
  }
}

/**
 * Instance multer dengan memoryStorage agar konten file bisa divalidasi
 * di memori SEBELUM dituliskan ke penyimpanan disk
 */
export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FOTO_MB * 1024 * 1024,
  },
});

/**
 * Middleware untuk menangani error multer secara ramah dan menghasilkan format JSON baku
 */
export function handleMulterError(err, req, res, next) {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        code: "FILE_TERLALU_BESAR",
        message: `Ukuran foto melebihi batas maksimal ${MAX_FOTO_MB} MB.`,
      });
    }

    if (
      err.code === "LIMIT_UNEXPECTED_FILE" ||
      err.code === "LIMIT_FILE_COUNT"
    ) {
      return res.status(400).json({
        code: "JUMLAH_FILE_SALAH",
        message: "Jumlah foto tidak sesuai atau field unggahan tidak dikenal.",
      });
    }

    return res.status(400).json({
      code: "FILE_TIDAK_VALID",
      message: `Terjadi kesalahan unggah berkas: ${err.message}`,
    });
  }

  return next(err);
}
