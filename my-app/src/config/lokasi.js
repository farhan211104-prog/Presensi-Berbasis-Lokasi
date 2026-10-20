// ============================================================================
// KONFIGURASI LOKASI PRESENSI MAHASISWA TELKOM UNIVERSITY
// Titik acuan koordinat GPS dan radius presensi (geofencing)
// ============================================================================

// Titik acuan presensi Telkom University:
// Lintang: -6.9856°
// Bujur: 107.6331°
export const LOKASI_PRESENSI = {
  nama: "Titik Acuan Presensi Telkom University",
  lat: -6.9856,
  lng: 107.6331,
};

// Batas toleransi radius presensi: 30 meter dari titik pusat
export const RADIUS_METER = 30;

// Mode demo: true = presensi boleh diulang. Set false untuk menerapkan aturan sekali presensi per pertemuan.
export const IZINKAN_PRESENSI_ULANG = import.meta.env.DEV;

