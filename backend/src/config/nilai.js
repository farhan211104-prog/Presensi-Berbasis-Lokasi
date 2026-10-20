// ============================================================================
// KONFIGURASI PENILAIAN MAHASISWA (STANDAR TELKOM UNIVERSITY)
// Seluruh bobot komponen dan skala konversi nilai terpusat di satu tempat ini
// sehingga mudah diubah sewaktu-waktu jika kebijakan akademik diperbarui.
// ============================================================================

// Bobot komponen evaluasi nilai akhir: Tugas (30%), UTS (30%), UAS (40%)
// Total bobot = 1.0 (100%)
export const BOBOT_KOMPONEN = {
  tugas: 0.30,
  uts: 0.30,
  uas: 0.40,
};

// Skala konversi nilai akhir numerik ke indeks huruf dan bobot angka (IP)
// Urutan disusun dari batas nilai tertinggi ke terendah
export const SKALA_NILAI = [
  { min: 80, huruf: "A", bobot: 4.0 },
  { min: 70, huruf: "AB", bobot: 3.5 },
  { min: 65, huruf: "B", bobot: 3.0 },
  { min: 60, huruf: "BC", bobot: 2.5 },
  { min: 50, huruf: "C", bobot: 2.0 },
  { min: 40, huruf: "D", bobot: 1.0 },
  { min: 0, huruf: "E", bobot: 0.0 },
];
