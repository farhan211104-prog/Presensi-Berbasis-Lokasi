// ============================================================================
// LAYANAN VERIFIKASI WAJAH / FACE RECOGNITION (ANTARMUKA STANDAR)
// Antarmuka terisolasi ini dirancang agar dapat langsung diintegrasikan dengan
// model AI/ML face recognition sesungguhnya tanpa mengubah kontrak input/output.
// ============================================================================

import { FACE_THRESHOLD } from "../config/env.js";

// Hook stub override untuk keperluan pengujian otomatis (automated testing)
let stubOverride = null;

/**
 * Menyetel fungsi mock/stub kustom untuk menguji jalur verifikasi gagal atau khusus
 * @param {Function|null} customFn
 */
export function setStubFaceService(customFn) {
  stubOverride = customFn;
}

/**
 * Mengembalikan stub ke perilaku default
 */
export function resetStubFaceService() {
  stubOverride = null;
}

/**
 * Memverifikasi kecocokan wajah antara foto presensi mahasiswa dengan sampel wajah biometrik terdaftar.
 *
 * ============================================================================
 * TODO: ganti dengan model face recognition sungguhan; kontrak input/output fungsi ini jangan diubah
 * ============================================================================
 *
 * @param {object} params
 * @param {Buffer} params.fotoBuffer - Buffer citra foto presensi (JPEG atau PNG)
 * @param {string[]} [params.samplePaths] - Daftar path file sampel wajah biometrik terdaftar di disk
 * @returns {Promise<{ cocok: boolean, skor: number, metode: string }>}
 *   - cocok: boolean (true jika skor >= FACE_THRESHOLD)
 *   - skor: number (rentang 0.0 s/d 1.0)
 *   - metode: string (nama algoritma / model yang digunakan)
 */
export function verifikasiWajah({ fotoBuffer, samplePaths = [] }) {
  // Jika sedang dalam mode testing dengan override aktif (bisa berupa fungsi atau objek langsung)
  if (typeof stubOverride === "function") {
    return stubOverride({ fotoBuffer, samplePaths });
  }
  if (stubOverride && typeof stubOverride === "object") {
    return stubOverride;
  }

  // IMPLEMENTASI STUB SIMULASI TAHAP 4:
  // Selalu menghasilkan kecocokan penuh (skor 1.0)
  return {
    cocok: true,
    skor: 1.0,
    metode: "face-recognition-simulasi",
  };
}
