// ============================================================================
// UTILITAS WAKTU & SIMULASI WAKTU (PORTAL TELKOM UNIVERSITY)
// Digunakan untuk pengujian status Hadir vs Terlambat tanpa menunggu jam kuliah nyata
// ============================================================================

/**
 * Mengambil waktu saat ini.
 * Jika simulasi waktu aktif di localStorage ('telu_simulasi_waktu'), waktu simulasi akan digunakan.
 * Jika tidak aktif, mengembalikan waktu sistem asli (new Date()).
 *
 * @returns {Date} Objek Date waktu saat ini atau waktu simulasi
 */
export function getWaktuSekarang() {
  try {
    const rawSim = localStorage.getItem("telu_simulasi_waktu");
    if (rawSim) {
      const simData = JSON.parse(rawSim);
      if (simData && simData.aktif && simData.jam) {
        // Format jam simulasi: "HH:mm" atau "YYYY-MM-DDTHH:mm"
        const now = new Date();
        const [simHour, simMin] = simData.jam.split(":").map(Number);
        const simDate = new Date(now);
        if (!isNaN(simHour) && !isNaN(simMin)) {
          simDate.setHours(simHour, simMin, 0, 0);
          return simDate;
        }
      }
    }
  } catch (e) {
    console.error("Gagal membaca simulasi waktu:", e);
  }

  return new Date();
}

/**
 * Format objek Date menjadi string format jam 24 jam "HH:mm" (contoh: "14:32")
 */
export function formatJamMenit(date = null) {
  const d = date || getWaktuSekarang();
  const jam = String(d.getHours()).padStart(2, "0");
  const menit = String(d.getMinutes()).padStart(2, "0");
  return `${jam}:${menit}`;
}

/**
 * Format tanggal Indonesia lengkap (contoh: "Senin, 12 Oktober 2026")
 */
export function formatTanggalIndonesia(date = null) {
  const d = date || getWaktuSekarang();
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Menghitung selisih menit antara jam mulai kuliah dan jam presensi.
 *
 * @param {string} jamMulaiStr - Jam mulai kuliah dalam format "HH:mm" (contoh: "14:30")
 * @param {string} jamPresensiStr - Jam presensi mahasiswa dalam format "HH:mm" (contoh: "14:53")
 * @returns {number} Selisih waktu dalam menit (positif jika setelah jam mulai)
 */
export function hitungSelisihMenit(jamMulaiStr, jamPresensiStr) {
  if (!jamMulaiStr || !jamPresensiStr) return 0;

  const [jamMulai, menitMulai] = jamMulaiStr.split(":").map(Number);
  const [jamPres, menitPres] = jamPresensiStr.split(":").map(Number);

  const totalMenitMulai = jamMulai * 60 + menitMulai;
  const totalMenitPres = jamPres * 60 + menitPres;

  return totalMenitPres - totalMenitMulai;
}

/**
 * Mengatur waktu simulasi ke localStorage
 * @param {string} jamStr - Format "HH:mm" (contoh: "14:50")
 */
export function setWaktuSimulasi(jamStr) {
  const data = { aktif: true, jam: jamStr };
  localStorage.setItem("telu_simulasi_waktu", JSON.stringify(data));
}

/**
 * Mereset waktu simulasi kembali ke waktu perangkat nyata
 */
export function resetWaktuSimulasi() {
  const data = { aktif: false, jam: "14:30" };
  localStorage.setItem("telu_simulasi_waktu", JSON.stringify(data));
}

