// ============================================================================
// UTILITAS WAKTU SERVER & PENGATURAN ZONA WAKTU (ASIA/JAKARTA, UTC+07:00)
// Seluruh perhitungan hari, jam, tanggal, dan simulasi waktu presensi berpusat di sini
// ============================================================================

import { ZONA_WAKTU, TANGGAL_MULAI_SEMESTER, IS_DEV } from "../config/env.js";

// Variabel in-memory untuk menyimpan waktu simulasi saat mode development
let waktuSimulasi = null;

/**
 * Mengambil objek Date waktu saat ini.
 * Jika mode dev aktif dan waktu simulasi telah disetel, fungsi ini mengembalikan waktu simulasi.
 * Jika tidak, mengembalikan waktu sistem nyata (new Date()).
 *
 * @returns {Date} Waktu saat ini atau waktu simulasi
 */
export function getWaktuSekarang() {
  if (IS_DEV && waktuSimulasi instanceof Date && !isNaN(waktuSimulasi.getTime())) {
    return new Date(waktuSimulasi.getTime());
  }
  return new Date();
}

/**
 * Menyetel waktu simulasi di memori server (HANYA saat mode development)
 * @param {string|Date|null} waktu - ISO string (contoh: "2026-10-14T14:40:00+07:00") atau null untuk menonaktifkan
 */
export function setWaktuSimulasi(waktu) {
  if (!IS_DEV) return null;
  if (!waktu) {
    waktuSimulasi = null;
    return null;
  }
  const d = new Date(waktu);
  if (isNaN(d.getTime())) {
    throw new Error("Format waktu simulasi tidak valid. Gunakan format ISO (contoh: 2026-10-14T14:40:00+07:00)");
  }
  waktuSimulasi = d;
  return getWaktuISOString(d);
}

/**
 * Mengambil waktu simulasi yang sedang aktif (atau null jika tidak aktif)
 * @returns {string|null}
 */
export function getWaktuSimulasiAktif() {
  if (IS_DEV && waktuSimulasi instanceof Date && !isNaN(waktuSimulasi.getTime())) {
    return getWaktuISOString(waktuSimulasi);
  }
  return null;
}

/**
 * Mengurai komponen tanggal & waktu dalam zona waktu Asia/Jakarta (UTC+07:00)
 * Menjamin hasil tidak bergantung pada zona waktu mesin server/host.
 *
 * @param {Date} date - Objek Date
 * @returns {{ year: string, month: string, day: string, hour: string, minute: string, second: string }}
 */
function getJakartaParts(date = getWaktuSekarang()) {
  const d = date instanceof Date ? date : new Date(date);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_WAKTU,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  return Object.fromEntries(formatter.formatToParts(d).map((p) => [p.type, p.value]));
}

/**
 * Format Date menjadi ISO 8601 string dengan offset +07:00 untuk disimpan di database
 * Contoh: "2026-10-14T14:40:00+07:00"
 *
 * @param {Date} date
 * @returns {string}
 */
export function getWaktuISOString(date = getWaktuSekarang()) {
  const p = getJakartaParts(date);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+07:00`;
}

/**
 * Mengambil nama hari dalam bahasa Indonesia ("Senin", "Selasa", dst.) di zona waktu Asia/Jakarta
 *
 * @param {Date} date
 * @returns {string}
 */
export function getHariIndonesia(date = getWaktuSekarang()) {
  const d = date instanceof Date ? date : new Date(date);
  const dayFmt = new Intl.DateTimeFormat("id-ID", {
    timeZone: ZONA_WAKTU,
    weekday: "long",
  });
  const hari = dayFmt.format(d);
  // Pastikan huruf kapital di awal kata (contoh: "senin" -> "Senin")
  return hari.charAt(0).toUpperCase() + hari.slice(1);
}

/**
 * Format tanggal dalam format "YYYY-MM-DD" di zona waktu Asia/Jakarta
 *
 * @param {Date} date
 * @returns {string}
 */
export function getTanggalString(date = getWaktuSekarang()) {
  const p = getJakartaParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * Format jam dalam format "HH:mm" (24 jam) di zona waktu Asia/Jakarta
 *
 * @param {Date} date
 * @returns {string}
 */
export function getJamMenitString(date = getWaktuSekarang()) {
  const p = getJakartaParts(date);
  return `${p.hour}:${p.minute}`;
}

/**
 * Mengonversi format jam "HH:mm" menjadi total menit dari tengah malam (00:00)
 *
 * @param {string} jamStr - Contoh: "14:30"
 * @returns {number} Contoh: 870
 */
export function parseJamKeMenit(jamStr) {
  if (!jamStr || typeof jamStr !== "string") return 0;
  const [jam, menit] = jamStr.split(":").map(Number);
  return (jam || 0) * 60 + (menit || 0);
}

/**
 * Menghitung minggu perkuliahan ke-N (1 s/d 15) berdasarkan tanggal mulai semester
 *
 * @param {string|Date} tanggalTarget - Tanggal target (contoh: "2026-10-12" atau objek Date)
 * @param {string} tanggalMulai - Tanggal mulai semester format YYYY-MM-DD (default: TANGGAL_MULAI_SEMESTER)
 * @returns {number} Minggu ke-N (misal 1..15, atau < 1 jika sebelum semester, > 15 jika lewat)
 */
export function hitungMingguKe(tanggalTarget = getWaktuSekarang(), tanggalMulai = TANGGAL_MULAI_SEMESTER) {
  const tanggalStr =
    typeof tanggalTarget === "string"
      ? tanggalTarget.slice(0, 10)
      : getTanggalString(tanggalTarget);

  const [tY, tM, tD] = tanggalStr.split("-").map(Number);
  const [sY, sM, sD] = tanggalMulai.split("-").map(Number);

  const targetUtc = Date.UTC(tY, tM - 1, tD);
  const startUtc = Date.UTC(sY, sM - 1, sD);

  const diffDays = Math.floor((targetUtc - startUtc) / (24 * 60 * 60 * 1000));
  return Math.floor(diffDays / 7) + 1;
}
