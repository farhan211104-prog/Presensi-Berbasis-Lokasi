// ============================================================================
// RUTE REKAP KEHADIRAN MAHASISWA
// Mengembalikan riwayat pertemuan berjalan dan ringkasan persentase kehadiran
// ============================================================================

import express from "express";
import db from "../db/connection.js";
import { authRequired, roleRequired } from "../middleware/auth.js";
import { getWaktuSekarang } from "../utils/waktu.js";
import { hitungRekap } from "../utils/rekap.js";

const router = express.Router();

// Prepared statement untuk mengecek apakah mahasiswa terdaftar pada mata kuliah tertentu
const checkEnrollmentStmt = db.prepare(`
  SELECT id FROM enrollment
  WHERE mahasiswa_id = ? AND mata_kuliah_id = ?
`);

// Prepared statement untuk mengambil detail mata kuliah dan jadwalnya
const findMatkulAndJadwalStmt = db.prepare(`
  SELECT
    m.id AS mataKuliahId,
    m.kode AS kode,
    m.nama AS nama,
    m.sks AS sks,
    u.nama AS dosenNama,
    u.username AS dosenKode,
    j.id AS jadwalId,
    j.hari AS hari,
    j.jam_mulai AS jamMulai,
    j.jam_selesai AS jamSelesai,
    j.ruangan AS ruangan
  FROM mata_kuliah m
  LEFT JOIN users u ON u.id = m.dosen_id
  LEFT JOIN jadwal j ON j.mata_kuliah_id = m.id
  WHERE m.id = ?
`);

// Prepared statement untuk mengambil daftar pertemuan kuliah pada jadwal tersebut
const findPertemuanByJadwalStmt = db.prepare(`
  SELECT id, jadwal_id, minggu_ke, tanggal, sesi_dibuka, catatan
  FROM pertemuan
  WHERE jadwal_id = ?
  ORDER BY minggu_ke ASC
`);

// Prepared statement untuk mengambil baris presensi mahasiswa pada jadwal tersebut
const findPresensiByMahasiswaAndJadwalStmt = db.prepare(`
  SELECT
    p.id,
    p.pertemuan_id,
    pt.minggu_ke,
    p.status,
    p.waktu_presensi,
    p.jarak_meter,
    p.diubah_dosen,
    p.catatan
  FROM presensi p
  JOIN pertemuan pt ON pt.id = p.pertemuan_id
  WHERE pt.jadwal_id = ? AND p.mahasiswa_id = ?
`);

/**
 * GET /api/rekap?mataKuliahId=<id>
 * Mengembalikan rekap kehadiran mahasiswa untuk satu mata kuliah.
 */
router.get(
  "/",
  authRequired,
  roleRequired("mahasiswa"),
  (req, res, next) => {
    try {
      const mahasiswaId = req.user.id;
      const { mataKuliahId } = req.query;

      // 1. Validasi parameter mataKuliahId
      const idNum = parseInt(mataKuliahId, 10);
      if (!mataKuliahId || isNaN(idNum) || idNum <= 0) {
        return res.status(400).json({
          error: "INPUT_TIDAK_VALID",
          message: "Parameter mataKuliahId wajib disertakan dan berupa ID numerik positif.",
        });
      }

      // 2. Validasi hak akses: mahasiswa wajib terdaftar di mata kuliah tersebut
      const enrollment = checkEnrollmentStmt.get(mahasiswaId, idNum);
      if (!enrollment) {
        return res.status(403).json({
          error: "BUKAN_PESERTA",
          message: "Anda tidak terdaftar sebagai peserta pada mata kuliah ini.",
        });
      }

      // 3. Ambil detail mata kuliah dan jadwal
      const matkulInfo = findMatkulAndJadwalStmt.get(idNum);
      if (!matkulInfo) {
        return res.status(404).json({
          error: "DATA_TIDAK_DITEMUKAN",
          message: "Data mata kuliah tidak ditemukan.",
        });
      }

      // 4. Ambil pertemuan dan riwayat presensi dari DB jika ada jadwalnya
      let pertemuanDbList = [];
      let presensiList = [];

      if (matkulInfo.jadwalId) {
        pertemuanDbList = findPertemuanByJadwalStmt.all(matkulInfo.jadwalId);
        presensiList = findPresensiByMahasiswaAndJadwalStmt.all(
          matkulInfo.jadwalId,
          mahasiswaId
        );
      }

      // 5. Hitung rekap menggunakan fungsi murni hitungRekap
      const waktuSekarang = getWaktuSekarang();
      const rekap = hitungRekap({
        jadwal: {
          hari: matkulInfo.hari || "Senin",
          jamMulai: matkulInfo.jamMulai || "00:00",
          jamSelesai: matkulInfo.jamSelesai || "23:59",
        },
        presensiList,
        pertemuanDbList,
        waktuSekarang,
      });

      return res.status(200).json({
        mataKuliah: {
          id: matkulInfo.mataKuliahId,
          kode: matkulInfo.kode,
          nama: matkulInfo.nama,
          sks: matkulInfo.sks,
          dosen: {
            nama: matkulInfo.dosenNama || "Belum Ditentukan",
            kode: matkulInfo.dosenKode || "-",
          },
        },
        ringkasan: rekap.ringkasan,
        pertemuan: rekap.pertemuan,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
