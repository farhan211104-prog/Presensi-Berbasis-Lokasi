// ============================================================================
// RUTE KHUSUS MODE DEVELOPMENT
// HANYA dimuat dan aktif ketika NODE_ENV !== "production"
// Digunakan untuk simulasi waktu server dan reset data pengujian
// ============================================================================

import express from "express";
import db from "../db/connection.js";
import { authRequired } from "../middleware/auth.js";
import {
  setWaktuSimulasi,
  getWaktuSimulasiAktif,
  getWaktuSekarang,
  getHariIndonesia,
  getTanggalString,
  hitungMingguKe,
} from "../utils/waktu.js";
import {
  WAJIB_DAFTAR_WAJAH,
  JUMLAH_SAMPLE_WAJAH,
  MAX_AKURASI_METER,
} from "../config/env.js";

const router = express.Router();

/**
 * GET /api/dev/config
 * Mengembalikan informasi flag konfigurasi server untuk pengujian di frontend
 */
router.get("/config", (req, res) => {
  return res.status(200).json({
    wajibDaftarWajah: WAJIB_DAFTAR_WAJAH,
    jumlahSampleWajah: JUMLAH_SAMPLE_WAJAH,
    maxAkurasiMeter: MAX_AKURASI_METER,
  });
});

/**
 * POST /api/dev/waktu
 * Menyetel waktu simulasi di memori server untuk pengujian skenario waktu
 * Body: { waktu: "2026-10-14T14:40:00+07:00" } atau { waktu: null }
 */
router.post("/waktu", (req, res, next) => {
  try {
    const { waktu } = req.body;
    const waktuDisetel = setWaktuSimulasi(waktu);
    return res.status(200).json({
      message: waktu
        ? "Waktu simulasi server berhasil diatur"
        : "Waktu simulasi server dinonaktifkan (kembali ke waktu sistem)",
      waktuSimulasi: waktuDisetel,
    });
  } catch (error) {
    return res.status(400).json({
      code: "FORMAT_WAKTU_SALAH",
      message: error.message,
    });
  }
});

/**
 * GET /api/dev/waktu
 * Mengambil informasi waktu simulasi server yang sedang aktif
 */
router.get("/waktu", (req, res) => {
  const waktuAktif = getWaktuSimulasiAktif();
  return res.status(200).json({
    waktuSimulasi: waktuAktif,
  });
});

/**
 * DELETE /api/dev/presensi/hari-ini
 * Menghapus seluruh rekaman presensi hari ini milik mahasiswa yang sedang login
 */
router.delete("/presensi/hari-ini", authRequired, (req, res, next) => {
  try {
    const waktuSekarang = getWaktuSekarang();
    const hariIni = getHariIndonesia(waktuSekarang);
    const tanggalHariIni = getTanggalString(waktuSekarang);
    const mingguKe = hitungMingguKe(tanggalHariIni);

    const deleteStmt = db.prepare(`
      DELETE FROM presensi
      WHERE mahasiswa_id = ?
        AND pertemuan_id IN (
          SELECT p.id FROM pertemuan p
          JOIN jadwal j ON j.id = p.jadwal_id
          WHERE LOWER(j.hari) = LOWER(?) AND p.minggu_ke = ?
        )
    `);

    const result = deleteStmt.run(req.user.id, hariIni, mingguKe);

    return res.status(200).json({
      message: "Data presensi hari ini berhasil dibersihkan",
      deletedCount: result.changes,
      hari: hariIni,
      mingguKe,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
