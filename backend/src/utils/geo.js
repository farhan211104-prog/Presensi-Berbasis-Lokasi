// ============================================================================
// UTILITAS GEOLOKASI (HAVERSINE & VALIDASI KOORDINAT)
// Menghitung jarak geodesic antara dua titik GPS di permukaan bumi
// ============================================================================

/**
 * Validasi apakah koordinat latitude dan longitude valid secara matematis dan geografis:
 * - Bertipe number dan bukan NaN / Infinity
 * - Latitude berada di rentang -90 s/d 90 derajat
 * - Longitude berada di rentang -180 s/d 180 derajat
 *
 * @param {any} lat - Nilai latitude
 * @param {any} lng - Nilai longitude
 * @returns {boolean} true jika koordinat valid
 */
export function isValidCoordinate(lat, lng) {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

/**
 * Menghitung jarak antara dua koordinat GPS dalam satuan meter (dibulatkan).
 * Menggunakan formula Haversine dengan rata-rata radius bumi 6.371.000 meter.
 *
 * @param {number} lat1 - Latitude titik pertama
 * @param {number} lng1 - Longitude titik pertama
 * @param {number} lat2 - Latitude titik kedua
 * @param {number} lng2 - Longitude titik kedua
 * @returns {number} Jarak dalam satuan meter (integer hasil Math.round)
 */
export function hitungJarakMeter(lat1, lng1, lat2, lng2) {
  // Jika koordinat kedua titik identik, jarak pasti 0
  if (lat1 === lat2 && lng1 === lng2) return 0;

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

  // Hasil jarak dalam meter yang dibulatkan
  return Math.round(R * c);
}
