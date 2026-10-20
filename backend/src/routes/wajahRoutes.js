// ============================================================================
// RUTE PENDAFTARAN & PENGELOLAAN SAMPEL WAJAH BIOMETRIK
// Mengelola status persetujuan, pendaftaran sampel wajah, hak hapus data,
// serta pengiriman gambar privat dengan proteksi otorisasi ketat
// ============================================================================

import express from "express";
import fs from "fs";
import path from "path";
import db from "../db/connection.js";
import { authRequired, roleRequired } from "../middleware/auth.js";
import {
  UPLOAD_DIR,
  JUMLAH_SAMPLE_WAJAH,
} from "../config/env.js";
import {
  deteksiTipeGambar,
  uploadMemory,
  handleMulterError,
  simpanSampleWajah,
  hapusFileAman,
} from "../utils/upload.js";

const router = express.Router();

// Prepared statement untuk mengecek persetujuan biometrik
const findPersetujuanStmt = db.prepare(`
  SELECT disetujui_pada, versi_teks
  FROM persetujuan_biometrik
  WHERE mahasiswa_id = ?
`);

// Prepared statement untuk menyimpan/memperbarui persetujuan biometrik
const upsertPersetujuanStmt = db.prepare(`
  INSERT INTO persetujuan_biometrik (mahasiswa_id, disetujui_pada, versi_teks)
  VALUES (?, CURRENT_TIMESTAMP, ?)
  ON CONFLICT(mahasiswa_id) DO UPDATE SET disetujui_pada = CURRENT_TIMESTAMP
`);

// Prepared statement untuk mengambil daftar sampel wajah mahasiswa
const findSamplesByMahasiswaStmt = db.prepare(`
  SELECT id, urutan, file_path, created_at
  FROM wajah_sample
  WHERE mahasiswa_id = ?
  ORDER BY urutan ASC
`);

// Prepared statement untuk menghapus seluruh sampel wajah mahasiswa
const deleteSamplesByMahasiswaStmt = db.prepare(`
  DELETE FROM wajah_sample
  WHERE mahasiswa_id = ?
`);

// Prepared statement untuk menghapus persetujuan biometrik
const deletePersetujuanStmt = db.prepare(`
  DELETE FROM persetujuan_biometrik
  WHERE mahasiswa_id = ?
`);

// Prepared statement untuk menyisipkan sampel wajah baru
const insertSampleStmt = db.prepare(`
  INSERT INTO wajah_sample (mahasiswa_id, file_path, urutan)
  VALUES (?, ?, ?)
`);

// Prepared statement untuk mencari sampel wajah berdasarkan ID
const findSampleByIdStmt = db.prepare(`
  SELECT id, mahasiswa_id, file_path, urutan
  FROM wajah_sample
  WHERE id = ?
`);

/**
 * GET /api/wajah/status
 * Mengambil status pendaftaran wajah mahasiswa yang sedang login
 */
router.get(
  "/status",
  authRequired,
  roleRequired("mahasiswa"),
  (req, res, next) => {
    try {
      const persetujuan = findPersetujuanStmt.get(req.user.id);
      const samples = findSamplesByMahasiswaStmt.all(req.user.id);

      const targetSample = JUMLAH_SAMPLE_WAJAH;
      const jumlahSample = samples.length;
      const sudahDaftar = jumlahSample >= targetSample;

      const daftarSample = samples.map((s) => ({
        id: s.id,
        urutan: s.urutan,
        url: `/api/wajah/sample/${s.id}/gambar`,
      }));

      return res.status(200).json({
        sudahDaftar,
        jumlahSample,
        targetSample,
        disetujui: Boolean(persetujuan),
        disetujuiPada: persetujuan?.disetujui_pada || null,
        daftarSample,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/wajah/persetujuan
 * Menyimpan persetujuan penggunaan data biometrik wajah
 * Body: { setuju: true }
 */
router.post(
  "/persetujuan",
  authRequired,
  roleRequired("mahasiswa"),
  (req, res, next) => {
    try {
      const { setuju } = req.body;
      if (setuju !== true) {
        return res.status(400).json({
          code: "INPUT_TIDAK_VALID",
          message: "Anda harus menyetujui pernyataan penggunaan data biometrik.",
        });
      }

      upsertPersetujuanStmt.run(req.user.id, "v1.0");

      return res.status(200).json({
        message: "Persetujuan penggunaan data biometrik wajah berhasil disimpan.",
        disetujui: true,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/wajah/daftar
 * Menerima JUMLAH_SAMPLE_WAJAH foto sekaligus (multipart/form-data field "foto")
 * Memvalidasi semuanya secara ketat (semua atau tidak sama sekali)
 */
router.post(
  "/daftar",
  authRequired,
  roleRequired("mahasiswa"),
  uploadMemory.array("foto", JUMLAH_SAMPLE_WAJAH + 1),
  handleMulterError,
  (req, res, next) => {
    try {
      // 1. Validasi persetujuan biometrik
      const persetujuan = findPersetujuanStmt.get(req.user.id);
      if (!persetujuan) {
        return res.status(403).json({
          code: "BELUM_SETUJU",
          message: "Persetujuan penggunaan data biometrik wajah wajib disetujui terlebih dahulu.",
        });
      }

      // 2. Validasi jumlah file
      const files = req.files || [];
      if (files.length !== JUMLAH_SAMPLE_WAJAH) {
        return res.status(400).json({
          code: "JUMLAH_FILE_SALAH",
          message: `Harap unggah tepat ${JUMLAH_SAMPLE_WAJAH} foto sampel wajah (diterima: ${files.length}).`,
        });
      }

      // 3. Validasi MAGIC BYTES untuk setiap file (semua atau tidak sama sekali)
      for (let i = 0; i < files.length; i++) {
        const tipe = deteksiTipeGambar(files[i].buffer);
        if (!tipe) {
          return res.status(400).json({
            code: "FILE_TIDAK_VALID",
            message: `Foto ke-${i + 1} tidak valid. File harus berupa citra asli berformat JPEG atau PNG.`,
          });
        }
      }

      // 4. Ambil sampel lama untuk dibersihkan setelah transaksi database sukses
      const oldSamples = findSamplesByMahasiswaStmt.all(req.user.id);

      // 5. Tulis file-file baru ke disk
      const newFiles = [];
      try {
        for (let i = 0; i < files.length; i++) {
          const simpanHasil = simpanSampleWajah({
            buffer: files[i].buffer,
            userId: req.user.id,
          });
          const pathString =
            typeof simpanHasil === "string" ? simpanHasil : simpanHasil.relPath;
          newFiles.push({ relPath: pathString, urutan: i + 1 });
        }
      } catch (writeErr) {
        // Rollback berkas disk yang sempat tertulis
        for (const item of newFiles) {
          hapusFileAman(item.relPath);
        }
        return res.status(500).json({
          code: "GAGAL_MENYIMPAN_FILE",
          message: "Gagal menyimpan berkas sampel foto ke server.",
        });
      }

      // 6. Simpan rekaman baru ke database dalam satu transaksi utuh
      db.exec("BEGIN");
      try {
        deleteSamplesByMahasiswaStmt.run(req.user.id);
        for (const item of newFiles) {
          insertSampleStmt.run(req.user.id, item.relPath, item.urutan);
        }
        db.exec("COMMIT");
      } catch (dbErr) {
        db.exec("ROLLBACK");
        // Hapus file baru dari disk jika transaksi database gagal
        for (const item of newFiles) {
          hapusFileAman(item.relPath);
        }
        return next(dbErr);
      }

      // 7. Hapus berkas sampel lama dari disk setelah transaksi sukses
      for (const old of oldSamples) {
        hapusFileAman(old.file_path);
      }

      // Ambil daftar sampel yang baru tersimpan untuk respons
      const savedRows = findSamplesByMahasiswaStmt.all(req.user.id);
      const daftarSample = savedRows.map((s) => ({
        id: s.id,
        urutan: s.urutan,
        url: `/api/wajah/sample/${s.id}/gambar`,
      }));

      return res.status(201).json({
        message: "Pendaftaran sampel wajah biometrik berhasil.",
        sudahDaftar: true,
        jumlahSample: JUMLAH_SAMPLE_WAJAH,
        totalSample: JUMLAH_SAMPLE_WAJAH,
        samples: daftarSample,
        daftarSample,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/wajah
 * Menghapus seluruh sampel wajah milik mahasiswa (file di disk dan database)
 * untuk pemenuhan hak hapus data biometrik
 */
router.delete(
  "/",
  authRequired,
  roleRequired("mahasiswa"),
  (req, res, next) => {
    try {
      const oldSamples = findSamplesByMahasiswaStmt.all(req.user.id);

      // Hapus data dari tabel database
      deleteSamplesByMahasiswaStmt.run(req.user.id);
      deletePersetujuanStmt.run(req.user.id);

      // Hapus file fisik dari disk
      for (const old of oldSamples) {
        hapusFileAman(old.file_path);
      }

      return res.status(200).json({
        message: "Seluruh data sampel wajah Anda berhasil dihapus.",
        sudahDaftar: false,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/wajah/sample/:id/gambar
 * Mengirim berkas gambar HANYA jika sampel tersebut milik pengguna yang sedang login.
 * Jika bukan pemiliknya -> kembalikan 404 (bukan 403) agar tidak membocorkan keberadaan data.
 */
router.get(
  "/sample/:id/gambar",
  authRequired,
  roleRequired("mahasiswa"),
  (req, res, next) => {
    try {
      const sampleId = parseInt(req.params.id, 10);
      if (isNaN(sampleId) || sampleId <= 0) {
        return res.status(404).json({
          code: "DATA_TIDAK_DITEMUKAN",
          message: "Sampel foto wajah tidak ditemukan.",
        });
      }

      const sample = findSampleByIdStmt.get(sampleId);

      // Otorisasi ketat: jika bukan milik pengguna yang login, kembalikan 404
      if (!sample || sample.mahasiswa_id !== req.user.id) {
        return res.status(404).json({
          code: "DATA_TIDAK_DITEMUKAN",
          message: "Sampel foto wajah tidak ditemukan.",
        });
      }

      const resolvedPath = path.resolve(UPLOAD_DIR, sample.file_path);
      if (!fs.existsSync(resolvedPath)) {
        return res.status(404).json({
          code: "DATA_TIDAK_DITEMUKAN",
          message: "Berkas foto fisik tidak ditemukan di server.",
        });
      }

      const fileBuffer = fs.readFileSync(resolvedPath);
      const tipe = deteksiTipeGambar(fileBuffer);

      // Header keamanan privasi data biometrik
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Type", tipe ? tipe.mime : "image/jpeg");

      return res.status(200).send(fileBuffer);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
