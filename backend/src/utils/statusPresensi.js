// ============================================================================
// LOGIKA PENENTUAN STATUS KEHADIRAN (STANDAR TELKOM UNIVERSITY)
// Menentukan apakah mahasiswa tercatat "hadir" atau "terlambat"
// berdasarkan perbandingan waktu presensi terhadap jam mulai kuliah.
// ============================================================================

import { TOLERANSI_TERLAMBAT_MENIT } from "../config/env.js";
import { parseJamKeMenit, getJamMenitString } from "./waktu.js";

/**
 * Fungsi murni untuk menghitung status presensi mahasiswa.
 *
 * Aturan Telkom University:
 * - Batas toleransi keterlambatan adalah 15 menit dari jam mulai kuliah.
 * - Jika presensi dilakukan <= (jamMulai + toleransi), status adalah "hadir".
 *   (Contoh: jamMulai 14:30, presensi 14:45 -> hadir, selisih 15 menit).
 * - Jika presensi dilakukan > (jamMulai + toleransi), status adalah "terlambat".
 *   (Contoh: jamMulai 14:30, presensi 14:46 -> terlambat, selisih 16 menit).
 *
 * @param {Date|string} waktuPresensi - Objek Date atau string waktu (ISO atau "HH:mm")
 * @param {string} jamMulai - Jam mulai kuliah dalam format "HH:mm" (contoh: "14:30")
 * @param {number} toleransiMenit - Toleransi dalam menit (default dari konfigurasi TOLERANSI_TERLAMBAT_MENIT = 15)
 * @returns {{ status: "hadir"|"terlambat", selisihMenit: number }}
 */
export function hitungStatus(waktuPresensi, jamMulai, toleransiMenit = TOLERANSI_TERLAMBAT_MENIT) {
  let jamPresensiStr;

  if (waktuPresensi instanceof Date) {
    jamPresensiStr = getJamMenitString(waktuPresensi);
  } else if (typeof waktuPresensi === "string") {
    // Jika format ISO seperti "2026-10-12T14:45:00+07:00", ambil bagian jam "14:45"
    if (waktuPresensi.includes("T")) {
      const match = waktuPresensi.match(/T(\d{2}:\d{2})/);
      jamPresensiStr = match ? match[1] : waktuPresensi;
    } else if (waktuPresensi.includes(":")) {
      jamPresensiStr = waktuPresensi.slice(0, 5);
    } else {
      jamPresensiStr = getJamMenitString(new Date(waktuPresensi));
    }
  } else {
    jamPresensiStr = getJamMenitString();
  }

  const menitMulai = parseJamKeMenit(jamMulai);
  const menitPresensi = parseJamKeMenit(jamPresensiStr);

  // Selisih menit antara waktu mahasiswa melakukan presensi dengan jam mulai kuliah
  // Bernilai 0 atau negatif jika presensi sebelum jam mulai
  const selisihMenit = menitPresensi - menitMulai;

  if (selisihMenit <= toleransiMenit) {
    return {
      status: "hadir",
      selisihMenit: Math.max(0, selisihMenit),
    };
  }

  return {
    status: "terlambat",
    selisihMenit,
  };
}
