// ============================================================================
// UTILITAS MURNI PERHITUNGAN REKAP KEHADIRAN MAHASISWA
// Seluruh logika evaluasi status per pertemuan dan statistik kehadiran ada di sini
// ============================================================================

import {
  BATAS_MINIMUM_KEHADIRAN_PERSEN,
  MAX_PERTEMUAN_SEMESTER,
} from "../config/rekap.js";
import { TANGGAL_MULAI_SEMESTER } from "../config/env.js";
import {
  getWaktuSekarang,
  getTanggalString,
  getJamMenitString,
  parseJamKeMenit,
} from "./waktu.js";

// Pemetaan nama hari Indonesia ke offset hari dari hari Senin (0 = Senin .. 6 = Minggu)
const HARI_OFFSET = {
  senin: 0,
  selasa: 1,
  rabu: 2,
  kamis: 3,
  jumat: 4,
  sabtu: 5,
  minggu: 6,
};

/**
 * Menghitung tanggal kalender (format YYYY-MM-DD) untuk pertemuan minggu ke-N
 * berdasarkan hari perkuliahan dan tanggal awal semester.
 *
 * @param {number} mingguKe - Pertemuan minggu ke (1 s/d 15)
 * @param {string} hariKuliah - Nama hari (contoh: "Senin", "Selasa", "Kamis")
 * @param {string} tanggalMulai - Tanggal mulai semester format YYYY-MM-DD (default: TANGGAL_MULAI_SEMESTER)
 * @returns {string} Tanggal pertemuan format "YYYY-MM-DD"
 */
export function hitungTanggalPertemuan(
  mingguKe,
  hariKuliah = "Senin",
  tanggalMulai = TANGGAL_MULAI_SEMESTER
) {
  const [sY, sM, sD] = tanggalMulai.split("-").map(Number);
  const startUtc = Date.UTC(sY, sM - 1, sD);

  const hariNorm = (hariKuliah || "senin").toLowerCase().trim();
  const dayOffset = HARI_OFFSET[hariNorm] !== undefined ? HARI_OFFSET[hariNorm] : 0;

  // Tanggal = tanggalMulai + ((mingguKe - 1) * 7 hari) + dayOffset hari
  const targetUtc = startUtc + ((mingguKe - 1) * 7 + dayOffset) * 24 * 60 * 60 * 1000;
  const d = new Date(targetUtc);

  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}

/**
 * Memformat tanggal YYYY-MM-DD menjadi format tanggal Indonesia ramah pengguna
 * Contoh: "2026-08-24" -> "24 Agu 2026"
 *
 * @param {string} tanggalStr - Format YYYY-MM-DD
 * @returns {string} Contoh: "24 Agu 2026"
 */
export function formatTanggalIndonesia(tanggalStr) {
  if (!tanggalStr) return "";
  const parts = tanggalStr.slice(0, 10).split("-");
  if (parts.length !== 3) return tanggalStr;

  const bulanList = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  const day = parts[2];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const year = parts[0];

  return `${day} ${bulanList[monthIdx] || parts[1]} ${year}`;
}

/**
 * Fungsi murni untuk menghitung rekap kehadiran mahasiswa pada suatu mata kuliah.
 *
 * Aturan status per pertemuan:
 * 1. Pertemuan di masa depan (tanggalnya setelah hari ini) -> TIDAK ditampilkan.
 * 2. Ada data presensi di DB -> gunakan statusnya (hadir/terlambat/izin/sakit/alpha).
 * 3. Tidak ada data presensi dan pertemuan sudah lewat (sebelum hari ini, atau hari ini setelah jam selesai)
 *    -> status "alpha" (dihitung saat pembacaan, tanpa menulis ke DB).
 * 4. Pertemuan hari ini yang belum selesai dan belum ada presensi
 *    -> status "belum" (tidak dihitung ke persentase total pertemuan berjalan).
 *
 * Rumus persentase kehadiran:
 * (hadir + terlambat) / totalPertemuanBerjalan * 100 (dibulatkan 1 desimal).
 * Peringatan bernilai true jika persentase < 75%.
 *
 * @param {object} params
 * @param {object} params.jadwal - Data jadwal { hari, jamMulai, jamSelesai }
 * @param {Array} params.presensiList - Daftar baris presensi dari DB atau array objek presensi
 * @param {Array} [params.pertemuanDbList] - Daftar baris pertemuan dari DB (opsional)
 * @param {Date} [params.waktuSekarang] - Waktu acuan saat ini (default: getWaktuSekarang())
 * @param {string} [params.tanggalMulaiSemester] - Tanggal awal semester (default: TANGGAL_MULAI_SEMESTER)
 * @param {object} [params.config] - Konfigurasi tambahan (batasPeringatan, maxPertemuan)
 * @returns {{ ringkasan: object, pertemuan: Array }}
 */
export function hitungRekap({
  jadwal = {},
  presensiList = [],
  pertemuanDbList = [],
  waktuSekarang = getWaktuSekarang(),
  tanggalMulaiSemester = TANGGAL_MULAI_SEMESTER,
  config = {},
}) {
  const batasPeringatan = config.batasPeringatan ?? BATAS_MINIMUM_KEHADIRAN_PERSEN;
  const maxPertemuan = config.maxPertemuan ?? MAX_PERTEMUAN_SEMESTER;

  const tanggalHariIni = getTanggalString(waktuSekarang);
  const jamMenitSekarang = getJamMenitString(waktuSekarang);
  const menitSekarang = parseJamKeMenit(jamMenitSekarang);
  const menitSelesai = parseJamKeMenit(jadwal.jamSelesai || "23:59");
  const menitMulai = parseJamKeMenit(jadwal.jamMulai || "00:00");

  // Petakan data presensi berdasarkan mingguKe atau pertemuanId
  const presensiByMinggu = new Map();
  for (const p of presensiList) {
    if (p.mingguKe !== undefined) {
      presensiByMinggu.set(p.mingguKe, p);
    } else if (p.minggu_ke !== undefined) {
      presensiByMinggu.set(p.minggu_ke, p);
    }
  }

  // Petakan catatan / materi pertemuan dari database
  const pertemuanDbByMinggu = new Map();
  for (const pt of pertemuanDbList) {
    if (pt.minggu_ke !== undefined) {
      pertemuanDbByMinggu.set(pt.minggu_ke, pt);
    } else if (pt.mingguKe !== undefined) {
      pertemuanDbByMinggu.set(pt.mingguKe, pt);
    }
  }

  const daftarPertemuan = [];

  for (let m = 1; m <= maxPertemuan; m++) {
    const tanggalPertemuan = hitungTanggalPertemuan(
      m,
      jadwal.hari,
      tanggalMulaiSemester
    );

    // 1. JANGAN tampilkan pertemuan yang belum terjadi (di masa depan)
    if (tanggalPertemuan > tanggalHariIni) {
      break;
    }

    const presensi = presensiByMinggu.get(m);
    const pertemuanDb = pertemuanDbByMinggu.get(m);

    let status = "alpha";
    let waktuPresensi = null;
    let selisihMenitTerlambat = 0;
    let diubahDosen = false;
    let catatan = pertemuanDb?.catatan || `Pertemuan Minggu ke-${m}`;

    if (presensi) {
      // Ada catatan presensi di database
      status = (presensi.status || "hadir").toLowerCase();
      waktuPresensi = presensi.waktuPresensi || presensi.waktu_presensi || null;
      diubahDosen = Boolean(presensi.diubahDosen || presensi.diubah_dosen);
      if (presensi.catatan) {
        catatan = presensi.catatan;
      }

      if (status === "terlambat") {
        if (presensi.selisihMenitTerlambat !== undefined) {
          selisihMenitTerlambat = presensi.selisihMenitTerlambat;
        } else if (presensi.selisihMenit !== undefined) {
          selisihMenitTerlambat = presensi.selisihMenit;
        } else if (waktuPresensi) {
          const jamPresStr = getJamMenitString(new Date(waktuPresensi));
          selisihMenitTerlambat = Math.max(0, parseJamKeMenit(jamPresStr) - menitMulai);
        }
      }
    } else {
      // Tidak ada catatan presensi di database
      if (tanggalPertemuan === tanggalHariIni) {
        // Pertemuan hari ini: jika perkuliahan belum selesai -> status "belum"
        if (menitSekarang <= menitSelesai) {
          status = "belum";
        } else {
          // Perkuliahan hari ini sudah selesai tetapi mahasiswa tidak presensi -> "alpha"
          status = "alpha";
        }
      } else {
        // Pertemuan di hari lampau tanpa presensi -> dihitung otomatis sebagai "alpha"
        status = "alpha";
      }
    }

    const formattedTanggal =
      pertemuanDb?.tanggal && !pertemuanDb.tanggal.includes("-")
        ? pertemuanDb.tanggal
        : formatTanggalIndonesia(tanggalPertemuan);

    daftarPertemuan.push({
      mingguKe: m,
      tanggal: formattedTanggal,
      tanggalIso: tanggalPertemuan,
      jamMulai: jadwal.jamMulai || "",
      jamSelesai: jadwal.jamSelesai || "",
      status,
      waktuPresensi,
      selisihMenitTerlambat,
      diubahDosen,
      catatan,
      isToday: tanggalPertemuan === tanggalHariIni,
    });
  }

  // Ringkasan statistik kehadiran
  // Pertemuan berstatus "belum" tidak dihitung ke total pertemuan berjalan
  const pertemuanBerjalan = daftarPertemuan.filter((p) => p.status !== "belum");
  const totalPertemuanBerjalan = pertemuanBerjalan.length;

  let hadir = 0;
  let terlambat = 0;
  let izin = 0;
  let sakit = 0;
  let alpha = 0;

  for (const p of pertemuanBerjalan) {
    if (p.status === "hadir") hadir++;
    else if (p.status === "terlambat") terlambat++;
    else if (p.status === "izin") izin++;
    else if (p.status === "sakit") sakit++;
    else if (p.status === "alpha") alpha++;
  }

  // Rumus persentase: (hadir + terlambat) / totalPertemuanBerjalan * 100, dibulatkan 1 desimal
  // Izin dan sakit TIDAK dihitung sebagai hadir
  let persentaseKehadiran = 0;
  if (totalPertemuanBerjalan > 0) {
    const rawPersen = ((hadir + terlambat) / totalPertemuanBerjalan) * 100;
    persentaseKehadiran = Math.round(rawPersen * 10) / 10;
  }

  // Peringatan jika persentase di bawah batas minimum (75%)
  // Jika total pertemuan berjalan 0, peringatan bernilai false (tidak memicu alarm)
  const peringatan =
    totalPertemuanBerjalan > 0 && persentaseKehadiran < batasPeringatan;

  return {
    ringkasan: {
      totalPertemuanBerjalan,
      hadir,
      terlambat,
      izin,
      sakit,
      alpha,
      totalMasuk: hadir + terlambat,
      persentaseKehadiran,
      peringatan,
      batasPeringatan,
    },
    pertemuan: daftarPertemuan,
  };
}
