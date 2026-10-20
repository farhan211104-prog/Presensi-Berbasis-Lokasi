// ============================================================================
// RUTE NILAI AKADEMIK MAHASISWA
// Mengembalikan daftar semester, rincian komponen nilai, IPS, dan IPK kumulatif
// ============================================================================

import express from "express";
import db from "../db/connection.js";
import { authRequired, roleRequired } from "../middleware/auth.js";
import { hitungNilaiMataKuliah, hitungIP } from "../utils/nilai.js";

const router = express.Router();

// Prepared statement untuk mengambil daftar semester yang memiliki nilai
const findSemesterMahasiswaStmt = db.prepare(`
  SELECT DISTINCT semester
  FROM nilai
  WHERE mahasiswa_id = ?
  ORDER BY semester DESC
`);

// Prepared statement untuk mengambil nilai mahasiswa pada semester tertentu
const findNilaiBySemesterStmt = db.prepare(`
  SELECT
    n.id AS nilaiId,
    m.kode AS kode,
    m.nama AS nama,
    m.sks AS sks,
    n.tugas AS tugas,
    n.uts AS uts,
    n.uas AS uas
  FROM nilai n
  JOIN mata_kuliah m ON m.id = n.mata_kuliah_id
  WHERE n.mahasiswa_id = ? AND n.semester = ?
  ORDER BY m.nama ASC
`);

// Prepared statement untuk mengambil seluruh nilai mahasiswa lintas semua semester (untuk IPK)
const findAllNilaiMahasiswaStmt = db.prepare(`
  SELECT
    n.id AS nilaiId,
    m.kode AS kode,
    m.nama AS nama,
    m.sks AS sks,
    n.tugas AS tugas,
    n.uts AS uts,
    n.uas AS uas
  FROM nilai n
  JOIN mata_kuliah m ON m.id = n.mata_kuliah_id
  WHERE n.mahasiswa_id = ?
`);

/**
 * GET /api/nilai/semester
 * Mengembalikan daftar periode semester yang memiliki data nilai untuk mahasiswa ini.
 */
router.get(
  "/semester",
  authRequired,
  roleRequired("mahasiswa"),
  (req, res, next) => {
    try {
      const mahasiswaId = req.user.id;
      const rows = findSemesterMahasiswaStmt.all(mahasiswaId);
      const semesterList = rows.map((r) => r.semester);

      return res.status(200).json({
        semester: semesterList,
        data: semesterList,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/nilai?semester=<semester>
 * Mengembalikan rincian nilai mata kuliah pada semester tertentu,
 * lengkap dengan perhitungan IPS dan IPK kumulatif dari server.
 */
router.get(
  "/",
  authRequired,
  roleRequired("mahasiswa"),
  (req, res, next) => {
    try {
      const mahasiswaId = req.user.id;
      const { semester } = req.query;

      // 1. Validasi parameter semester
      if (!semester || typeof semester !== "string" || !semester.trim()) {
        return res.status(400).json({
          error: "INPUT_TIDAK_VALID",
          message: "Parameter semester wajib disertakan.",
        });
      }

      const semesterTrimmed = semester.trim();

      // 2. Validasi apakah semester terdaftar pada data mahasiswa
      const availableSemesters = findSemesterMahasiswaStmt.all(mahasiswaId).map((r) => r.semester);
      if (!availableSemesters.includes(semesterTrimmed)) {
        return res.status(400).json({
          error: "INPUT_TIDAK_VALID",
          message: `Semester "${semesterTrimmed}" tidak ditemukan untuk mahasiswa ini.`,
        });
      }

      // 3. Ambil data nilai mata kuliah pada semester yang diminta
      const matkulRows = findNilaiBySemesterStmt.all(mahasiswaId, semesterTrimmed);
      const mataKuliahList = matkulRows.map((mk) => hitungNilaiMataKuliah(mk));

      // 4. Hitung IPS untuk semester yang diminta
      const ipsResult = hitungIP(mataKuliahList);

      // 5. Ambil data nilai dari SEMUA semester untuk menghitung IPK kumulatif
      const allRows = findAllNilaiMahasiswaStmt.all(mahasiswaId);
      const allMataKuliahList = allRows.map((mk) => hitungNilaiMataKuliah(mk));
      const ipkResult = hitungIP(allMataKuliahList);

      return res.status(200).json({
        semester: semesterTrimmed,
        totalSks: ipsResult.totalSks,
        ips: ipsResult.ip,
        ipk: ipkResult.ip,
        totalSksKumulatif: ipkResult.totalSks,
        mataKuliah: mataKuliahList,
        data: mataKuliahList,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
