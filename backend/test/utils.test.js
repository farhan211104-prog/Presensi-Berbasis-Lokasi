// ============================================================================
// PENGUJIAN OTOMATIS UTILITAS MURNI (NODE:TEST & NODE:ASSERT)
// Menguji fungsi Haversine, validasi koordinat GPS, dan penentuan status kehadiran
// ============================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { hitungJarakMeter, isValidCoordinate } from "../src/utils/geo.js";
import { hitungStatus } from "../src/utils/statusPresensi.js";

describe("1. Pengujian Utilitas Geolokasi (hitungJarakMeter)", () => {
  test("Jarak antara dua koordinat yang identik harus bernilai tepat 0 meter", () => {
    const lat = -6.9856;
    const lng = 107.6331;
    const jarak = hitungJarakMeter(lat, lng, lat, lng);
    assert.strictEqual(jarak, 0);
  });

  test("Jarak antara titik acuan Tel-U dan titik luar radius (~340m) harus akurat", () => {
    // Titik acuan kampus Tel-U
    const latAcuan = -6.9856;
    const lngAcuan = 107.6331;
    // Titik preset luar radius pengujian (~340 meter)
    const latLuar = -6.9880;
    const lngLuar = 107.6350;

    const jarak = hitungJarakMeter(latAcuan, lngAcuan, latLuar, lngLuar);
    // Toleransi deviasi perhitungan jarak geodesic bumi antara 330m s/d 355m
    assert.ok(jarak >= 330 && jarak <= 355, `Jarak terhitung ${jarak}m seharusnya berada di sekitar 340m`);
  });

  test("Jarak bersifat simetris (jarak A ke B sama dengan B ke A)", () => {
    const d1 = hitungJarakMeter(-6.9856, 107.6331, -6.9850, 107.6335);
    const d2 = hitungJarakMeter(-6.9850, 107.6335, -6.9856, 107.6331);
    assert.strictEqual(d1, d2);
  });
});

describe("2. Pengujian Validasi Koordinat GPS (isValidCoordinate)", () => {
  test("Koordinat sah dalam batas latitude (-90..90) dan longitude (-180..180) menghasilkan true", () => {
    assert.strictEqual(isValidCoordinate(-6.9856, 107.6331), true);
    assert.strictEqual(isValidCoordinate(0, 0), true);
    assert.strictEqual(isValidCoordinate(-90, -180), true);
    assert.strictEqual(isValidCoordinate(90, 180), true);
  });

  test("Latitude di luar -90 s/d 90 harus ditolak (false)", () => {
    assert.strictEqual(isValidCoordinate(-90.1, 107.6331), false);
    assert.strictEqual(isValidCoordinate(91, 107.6331), false);
  });

  test("Longitude di luar -180 s/d 180 harus ditolak (false)", () => {
    assert.strictEqual(isValidCoordinate(-6.9856, -180.1), false);
    assert.strictEqual(isValidCoordinate(-6.9856, 180.5), false);
  });

  test("Tipe non-angka atau bernilai tak terhingga (NaN, Infinity, String, Null) harus ditolak", () => {
    assert.strictEqual(isValidCoordinate(NaN, 107.6331), false);
    assert.strictEqual(isValidCoordinate(-6.9856, Infinity), false);
    assert.strictEqual(isValidCoordinate("-6.9856", 107.6331), false);
    assert.strictEqual(isValidCoordinate(null, undefined), false);
  });
});

describe("3. Pengujian Status Kehadiran (hitungStatus)", () => {
  const jamMulai = "14:30";
  const toleransi = 15;

  test("Presensi sebelum jam mulai kuliah (contoh: 14:20) menghasilkan status 'hadir' dengan selisih 0", () => {
    const hasil = hitungStatus("14:20", jamMulai, toleransi);
    assert.strictEqual(hasil.status, "hadir");
    assert.strictEqual(hasil.selisihMenit, 0);
  });

  test("Presensi tepat pada jam mulai kuliah (14:30) menghasilkan status 'hadir' dengan selisih 0", () => {
    const hasil = hitungStatus("14:30", jamMulai, toleransi);
    assert.strictEqual(hasil.status, "hadir");
    assert.strictEqual(hasil.selisihMenit, 0);
  });

  test("Presensi tepat batas toleransi +15 menit (14:45) menghasilkan status 'hadir' dengan selisih 15", () => {
    const hasil = hitungStatus("14:45", jamMulai, toleransi);
    assert.strictEqual(hasil.status, "hadir");
    assert.strictEqual(hasil.selisihMenit, 15);
  });

  test("Presensi melewati batas toleransi +16 menit (14:46) menghasilkan status 'terlambat' dengan selisih 16", () => {
    const hasil = hitungStatus("14:46", jamMulai, toleransi);
    assert.strictEqual(hasil.status, "terlambat");
    assert.strictEqual(hasil.selisihMenit, 16);
  });

  test("Presensi terlambat 30 menit (15:00) menghasilkan status 'terlambat' dengan selisih 30", () => {
    const hasil = hitungStatus("15:00", jamMulai, toleransi);
    assert.strictEqual(hasil.status, "terlambat");
    assert.strictEqual(hasil.selisihMenit, 30);
  });

  test("Mendukung input waktu berupa objek Date dan ISO string", () => {
    const dateObj = new Date("2026-10-12T14:40:00+07:00");
    const hasilDate = hitungStatus(dateObj, jamMulai, toleransi);
    assert.strictEqual(hasilDate.status, "hadir");
    assert.strictEqual(hasilDate.selisihMenit, 10);

    const isoStr = "2026-10-12T14:55:00+07:00";
    const hasilISO = hitungStatus(isoStr, jamMulai, toleransi);
    assert.strictEqual(hasilISO.status, "terlambat");
    assert.strictEqual(hasilISO.selisihMenit, 25);
  });
});
