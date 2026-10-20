// ============================================================================
// KONFIGURASI ATURAN PRESENSI MAHASISWA & DOSEN TELKOM UNIVERSITY
// Menyimpan konstanta toleransi keterlambatan dan default sesi presensi
// ============================================================================

// Batas toleransi keterlambatan dalam menit (standar Tel-U: 15 menit dari jam mulai)
// Presensi <= jamMulai + 15 menit -> "Hadir"
// Presensi > jamMulai + 15 menit  -> "Terlambat"
export const TOLERANSI_TERLAMBAT_MENIT = 15;

// Status default pembukaan sesi presensi oleh dosen:
// Saat mode development (import.meta.env.DEV), default adalah true (TERBUKA) agar pengujian lancar.
export const DEFAULT_SESI_BUKA = true;

// Minggu berjalan saat ini dalam semester (semester aktif: Minggu ke-8)
export const MINGGU_BERJALAN_DEFAULT = 8;
