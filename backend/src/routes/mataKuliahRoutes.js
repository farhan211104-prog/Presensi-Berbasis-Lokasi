// ============================================================================
// RUTE MATA KULIAH MAHASISWA
// Mengambil daftar mata kuliah yang diambil mahasiswa berdasarkan enrollment
// ============================================================================

import express from "express";
import db from "../db/connection.js";
import { authRequired, roleRequired } from "../middleware/auth.js";

const router = express.Router();

// Prepared statement untuk mengambil seluruh mata kuliah yang diambil mahasiswa
const findMataKuliahByMahasiswaStmt = db.prepare(`
  SELECT
    m.id AS id,
    m.kode AS kode,
    m.nama AS nama,
    m.sks AS sks,
    u.nama AS dosenNama,
    u.username AS dosenKode
  FROM mata_kuliah m
  JOIN enrollment e ON e.mata_kuliah_id = m.id
  LEFT JOIN users u ON u.id = m.dosen_id
  WHERE e.mahasiswa_id = ?
  ORDER BY m.nama ASC
`);

/**
 * GET /api/mata-kuliah
 * Mengembalikan daftar mata kuliah yang diikuti mahasiswa (lewat enrollment):
 * id, kode, nama, sks, dosen (nama + kode).
 * Digunakan untuk dropdown di halaman Rekap Kehadiran.
 */
router.get(
  "/",
  authRequired,
  roleRequired("mahasiswa"),
  (req, res, next) => {
    try {
      // Selalu gunakan ID mahasiswa dari token autentikasi (req.user.id)
      const mahasiswaId = req.user.id;

      const rows = findMataKuliahByMahasiswaStmt.all(mahasiswaId);

      const formatted = rows.map((r) => ({
        id: r.id,
        kode: r.kode,
        nama: r.nama,
        sks: r.sks,
        dosen: {
          nama: r.dosenNama || "Belum Ditentukan",
          kode: r.dosenKode || "-",
        },
      }));

      return res.status(200).json({
        data: formatted,
        mataKuliah: formatted,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
