// ============================================================================
// UTILITAS GEOLOKASI (RUMUS HAVERSINE)
// Menghitung jarak geodesic antara dua titik koordinat bumi (latitude & longitude)
// ============================================================================

/**
 * Menghitung jarak antara dua koordinat dalam satuan meter (dibulatkan).
 * Menggunakan formula Haversine dengan rata-rata radius bumi 6.371.000 meter.
 *
 * @param {number} lat1 - Latitude titik awal
 * @param {number} lng1 - Longitude titik awal
 * @param {number} lat2 - Latitude titik tujuan
 * @param {number} lng2 - Longitude titik tujuan
 * @returns {number} Jarak dalam meter yang telah dibulatkan
 */
export function hitungJarakMeter(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Radius rata-rata bumi dalam meter

  // Konversi derajat ke radian
  const toRadian = (degree) => (degree * Math.PI) / 180;

  const dLat = toRadian(lat2 - lat1);
  const dLng = toRadian(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadian(lat1)) *
      Math.cos(toRadian(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Hasil jarak dalam meter (dibulatkan)
  return Math.round(R * c);
}
