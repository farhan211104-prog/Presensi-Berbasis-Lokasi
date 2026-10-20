// ============================================================================
// RUTE JADWAL KULIAH MAHASISWA
// Mengambil jadwal perkuliahan hari ini yang terdaftar pada mahasiswa
// ============================================================================

import express from "express";
import db from "../db/connection.js";
import { authRequired, roleRequired } from "../middleware/auth.js";
import {
  getWaktuSekarang,
  getHariIndonesia,
  getTanggalString,
  getJamMenitString,
  getWaktuISOString,
  parseJamKeMenit,
  hitungMingguKe,
} from "../utils/waktu.js";
import {
  PRESENSI_BUKA_SEBELUM_MENIT,
  DEV_SESI_SELALU_BUKA,
  DEV_IZINKAN_PRESENSI_ULANG,
} from "../config/env.js";

const router = express.Router();

// Prepared statement untuk query jadwal hari ini berdasarkan enrollment mahasiswa
const findJadwalHariIniStmt = db.prepare(`
  SELECT
    j.id AS jadwalId,
    m.kode AS kode,
    m.nama AS nama,
    m.sks AS sks,
    j.jam_mulai AS jamMulai,
    j.jam_selesai AS jamSelesai,
    j.ruangan AS ruangan,
    u.nama AS dosenNama,
    u.username AS dosenKode,
    j.lokasi_nama AS lokasiNama,
    j.lat AS lat,
    j.lng AS lng,
    j.radius_meter AS radiusMeter
  FROM jadwal j
  JOIN enrollment e ON e.mata_kuliah_id = j.mata_kuliah_id
  JOIN mata_kuliah m ON m.id = j.mata_kuliah_id
  LEFT JOIN users u ON u.id = m.dosen_id
  WHERE e.mahasiswa_id = ? AND LOWER(j.hari) = LOWER(?)
  ORDER BY j.jam_mulai ASC
`);

// Prepared statement untuk mencari atau membuat pertemuan kuliah
const findPertemuanStmt = db.prepare(`
  SELECT id, minggu_ke, tanggal, sesi_dibuka
  FROM pertemuan
  WHERE jadwal_id = ? AND minggu_ke = ?
`);

const insertPertemuanStmt = db.prepare(`
  INSERT INTO pertemuan (jadwal_id, minggu_ke, tanggal, sesi_dibuka, catatan)
  VALUES (?, ?, ?, ?, ?)
`);

// Prepared statement untuk memeriksa riwayat presensi mahasiswa
const findPresensiStmt = db.prepare(`
  SELECT id, status, waktu_presensi, jarak_meter, foto_path
  FROM presensi
  WHERE pertemuan_id = ? AND mahasiswa_id = ?
`);

/**
 * GET /api/jadwal/hari-ini
 * Mengambil seluruh jadwal kuliah hari ini milik mahasiswa yang sedang login.
 */
router.get(
  "/hari-ini",
  authRequired,
  roleRequired("mahasiswa"),
  (req, res, next) => {
    try {
      const waktuSekarang = getWaktuSekarang();
      const hariIni = getHariIndonesia(waktuSekarang);
      const tanggalHariIni = getTanggalString(waktuSekarang);
      const jamMenitSekarang = getJamMenitString(waktuSekarang);
      const waktuServer = getWaktuISOString(waktuSekarang);
      const mingguKe = hitungMingguKe(tanggalHariIni);
      const menitSekarang = parseJamKeMenit(jamMenitSekarang);

      // Ambil daftar jadwal kuliah mahasiswa untuk hari ini
      const rows = findJadwalHariIniStmt.all(req.user.id, hariIni);

      const jadwalResult = rows.map((j) => {
        let pertemuanData = null;
        let presensiData = null;
        let bolehPresensi = false;
        let alasan = null;

        // 1. Validasi masa perkuliahan (Minggu 1 s/d 15)
        if (mingguKe < 1 || mingguKe > 15) {
          bolehPresensi = false;
          alasan = `Di luar masa perkuliahan semester (Minggu ke-${mingguKe})`;
        } else {
          // Cari pertemuan minggu ini, jika belum ada buat otomatis
          let pert = findPertemuanStmt.get(j.jadwalId, mingguKe);

          if (!pert) {
            const defaultSesi = DEV_SESI_SELALU_BUKA ? 1 : 0;
            const info = insertPertemuanStmt.run(
              j.jadwalId,
              mingguKe,
              tanggalHariIni,
              defaultSesi,
              `Perkuliahan Minggu ke-${mingguKe}`
            );
            pert = {
              id: info.lastInsertRowid,
              minggu_ke: mingguKe,
              tanggal: tanggalHariIni,
              sesi_dibuka: defaultSesi,
            };
          }

          // Cek status sesi presensi (pertimbangkan flag DEV_SESI_SELALU_BUKA)
          const sesiAktif = Boolean(pert.sesi_dibuka || DEV_SESI_SELALU_BUKA);

          pertemuanData = {
            id: pert.id,
            mingguKe: pert.minggu_ke,
            sesiDibuka: sesiAktif,
          };

          // Cek data presensi mahasiswa untuk pertemuan ini
          const presRow = findPresensiStmt.get(pert.id, req.user.id);
          if (presRow) {
            let selisihMenitTerlambat = 0;
            if (presRow.status === "terlambat" && presRow.waktu_presensi) {
              const jamPresStr = getJamMenitString(new Date(presRow.waktu_presensi));
              selisihMenitTerlambat = Math.max(
                0,
                parseJamKeMenit(jamPresStr) - parseJamKeMenit(j.jamMulai)
              );
            }

            presensiData = {
              id: presRow.id,
              status: presRow.status,
              waktuPresensi: presRow.waktu_presensi,
              jarakMeter: presRow.jarak_meter,
              selisihMenitTerlambat,
              fotoUrl: presRow.foto_path ? `/api/presensi/${presRow.id}/foto` : null,
            };
          }

          // Periksa jendela waktu presensi: jamMulai - 15 menit s/d jamSelesai
          const menitMulai = parseJamKeMenit(j.jamMulai);
          const menitSelesai = parseJamKeMenit(j.jamSelesai);
          const menitBukaPresensi = menitMulai - PRESENSI_BUKA_SEBELUM_MENIT;

          if (menitSekarang < menitBukaPresensi) {
            bolehPresensi = false;
            alasan = `Presensi belum dibuka (dibuka 15 menit sebelum kuliah, pukul ${j.jamMulai})`;
          } else if (menitSekarang > menitSelesai) {
            bolehPresensi = false;
            alasan = `Waktu perkuliahan telah berakhir (selesai pukul ${j.jamSelesai})`;
          } else if (!sesiAktif) {
            bolehPresensi = false;
            alasan = "Sesi presensi belum dibuka oleh dosen pengampu";
          } else if (presensiData && !DEV_IZINKAN_PRESENSI_ULANG) {
            bolehPresensi = false;
            alasan = "Anda sudah melakukan presensi pada pertemuan ini";
          } else {
            bolehPresensi = true;
            alasan = null;
          }
        }

        return {
          jadwalId: j.jadwalId,
          kode: j.kode,
          nama: j.nama,
          sks: j.sks,
          jamMulai: j.jamMulai,
          jamSelesai: j.jamSelesai,
          ruangan: j.ruangan,
          dosen: {
            nama: j.dosenNama || "Belum Ditentukan",
            kode: j.dosenKode || "-",
          },
          lokasi: {
            nama: j.lokasiNama,
            lat: j.lat,
            lng: j.lng,
            radiusMeter: j.radiusMeter,
          },
          pertemuan: pertemuanData,
          presensi: presensiData,
          bolehPresensi,
          alasan,
        };
      });

      return res.status(200).json({
        waktuServer,
        jadwal: jadwalResult,
        data: jadwalResult,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
