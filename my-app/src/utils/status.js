import { TOLERANSI_TERLAMBAT_MENIT } from "../config/presensiConfig";
import { hitungSelisihMenit } from "./waktu";

// ============================================================================
// LOGIKA STATUS KEHADIRAN (STANDAR TELKOM UNIVERSITY)
// Menentukan status Hadir vs Terlambat vs Alpha berdasarkan aturan waktu
// ============================================================================

/**
 * Menghitung status kehadiran otomatis mahasiswa dari jam presensi terhadap jadwal kuliah.
 *
 * @param {string} jamPresensiStr - Jam presensi mahasiswa format "HH:mm" (contoh: "14:48")
 * @param {string} rentangWaktuKuliah - Rentang waktu kuliah (contoh: "14:30 - 16:30")
 * @returns {object} Objek status: { status, label, selisihMenit, badgeColor }
 */
export function tentukanStatusPresensi(
  jamPresensiStr,
  rentangWaktuKuliah,
  toleransiMenit = TOLERANSI_TERLAMBAT_MENIT
) {
  if (!jamPresensiStr) {
    return {
      status: "Belum Presensi",
      label: "Belum Presensi",
      selisihMenit: 0,
      badgeColor: "gray",
    };
  }

  // Bersihkan string jam jika berformat "Hadir pukul 14:32"
  let cleanJam = jamPresensiStr;
  const match = jamPresensiStr.match(/(\d{1,2}:\d{2})/);
  if (match) {
    cleanJam = match[1];
  }

  // Ambil jam mulai kuliah dari format "14:30 - 16:30"
  const parts = rentangWaktuKuliah.split("-").map((s) => s.trim());
  const jamMulai = parts[0] || "14:30";

  // Hitung selisih keterlambatan dari jam mulai kuliah
  const selisih = hitungSelisihMenit(jamMulai, cleanJam);

  // Jika presensi dilakukan sebelum atau sampai batas toleransi (jamMulai + 15 menit)
  if (selisih <= toleransiMenit) {
    return {
      status: "Hadir",
      label: "Hadir",
      selisihMenit: selisih > 0 ? selisih : 0,
      badgeColor: "green",
    };
  }

  // Jika presensi melebihi batas toleransi
  return {
    status: "Terlambat",
    label: `Terlambat ${selisih} menit`,
    selisihMenit: selisih,
    badgeColor: "yellow",
  };
}

/**
 * Konfigurasi warna, simbol inisial, dan label badge untuk seluruh status presensi
 */
export const STATUS_CONFIG = {
  Hadir: {
    kode: "H",
    label: "Hadir",
    color: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
  },
  Terlambat: {
    kode: "T",
    label: "Terlambat",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
  },
  Izin: {
    kode: "I",
    label: "Izin",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
  },
  Sakit: {
    kode: "S",
    label: "Sakit",
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
  },
  Alpha: {
    kode: "A",
    label: "Alpha",
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
  },
  "Belum Presensi": {
    kode: "-",
    label: "Belum Presensi",
    color: "#64748B",
    bg: "#F1F5F9",
    border: "#CBD5E1",
  },
};
