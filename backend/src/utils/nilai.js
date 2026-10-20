// ============================================================================
// UTILITAS MURNI PERHITUNGAN NILAI, IPS, DAN IPK MAHASISWA
// Mengonversi nilai komponen (tugas, UTS, UAS) menjadi nilai akhir,
// indeks huruf, bobot angka, serta menghitung IPS dan IPK kumulatif
// ============================================================================

import { BOBOT_KOMPONEN, SKALA_NILAI } from "../config/nilai.js";

/**
 * Mengonversi nilai akhir numerik (0 s/d 100) menjadi indeks huruf dan bobot angka
 * berdasarkan skala standar Telkom University.
 *
 * @param {number} nilaiAkhir - Nilai akhir numerik
 * @param {Array} skala - Skala konversi nilai (default: SKALA_NILAI)
 * @returns {{ huruf: string, bobot: number }}
 */
export function konversiNilaiKeIndeks(nilaiAkhir, skala = SKALA_NILAI) {
  const nilai = Number(nilaiAkhir) || 0;
  for (const item of skala) {
    if (nilai >= item.min) {
      return {
        huruf: item.huruf,
        bobot: item.bobot,
      };
    }
  }
  return { huruf: "E", bobot: 0.0 };
}

/**
 * Menghitung nilai akhir numerik dari komponen tugas, UTS, dan UAS.
 * Rumus: (tugas * 30%) + (UTS * 30%) + (UAS * 40%), dibulatkan 1 desimal.
 *
 * @param {number} tugas - Nilai tugas (0 s/d 100)
 * @param {number} uts - Nilai UTS (0 s/d 100)
 * @param {number} uas - Nilai UAS (0 s/d 100)
 * @param {object} bobot - Bobot komponen (default: BOBOT_KOMPONEN)
 * @returns {number} Nilai akhir desimal
 */
export function hitungNilaiAkhir(tugas, uts, uas, bobot = BOBOT_KOMPONEN) {
  const t = Number(tugas) || 0;
  const ut = Number(uts) || 0;
  const ua = Number(uas) || 0;

  const total = t * (bobot.tugas || 0.3) + ut * (bobot.uts || 0.3) + ua * (bobot.uas || 0.4);
  return Math.round(total * 10) / 10;
}

/**
 * Menghitung rincian nilai untuk satu mata kuliah
 *
 * @param {object} mk - Objek mata kuliah { kode, nama, sks, tugas, uts, uas }
 * @param {object} [options]
 * @returns {object} Objek lengkap dengan nilaiAkhir, indeksHuruf, dan bobot
 */
export function hitungNilaiMataKuliah(mk, options = {}) {
  const sks = Number(mk.sks) || 0;
  const tugas = Number(mk.tugas) || 0;
  const uts = Number(mk.uts) || 0;
  const uas = Number(mk.uas) || 0;

  const nilaiAkhir = hitungNilaiAkhir(tugas, uts, uas, options.bobot || BOBOT_KOMPONEN);
  const konversi = konversiNilaiKeIndeks(nilaiAkhir, options.skala || SKALA_NILAI);

  return {
    kode: mk.kode || "",
    nama: mk.nama || "",
    sks,
    tugas,
    uts,
    uas,
    nilaiAkhir,
    indeksHuruf: konversi.huruf,
    // Sediakan juga alias indeks untuk kompatibilitas frontend
    indeks: konversi.huruf,
    bobot: konversi.bobot,
  };
}

/**
 * Fungsi murni untuk menghitung Indeks Prestasi (IPS maupun IPK).
 * Rumus: jumlah(bobot * sks) / jumlah(sks), dibulatkan 2 desimal.
 * Jika total SKS = 0, mengembalikan 0 tanpa error pembagian nol.
 *
 * @param {Array} mataKuliahList - Daftar mata kuliah dengan atribut sks dan bobot
 * @returns {{ totalSks: number, totalBobotSks: number, ip: number }}
 */
export function hitungIP(mataKuliahList = []) {
  if (!Array.isArray(mataKuliahList) || mataKuliahList.length === 0) {
    return {
      totalSks: 0,
      totalBobotSks: 0,
      ip: 0,
    };
  }

  let totalSks = 0;
  let totalBobotSks = 0;

  for (const mk of mataKuliahList) {
    const sks = Number(mk.sks) || 0;
    const bobot = Number(mk.bobot) || 0;

    totalSks += sks;
    totalBobotSks += bobot * sks;
  }

  if (totalSks === 0) {
    return {
      totalSks: 0,
      totalBobotSks: 0,
      ip: 0,
    };
  }

  // Dibulatkan 2 desimal
  const ip = Math.round((totalBobotSks / totalSks) * 100) / 100;

  return {
    totalSks,
    totalBobotSks: Math.round(totalBobotSks * 100) / 100,
    ip,
  };
}
