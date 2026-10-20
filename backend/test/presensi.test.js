// ============================================================================
// PENGUJIAN INTEGRASI ENDPOINT PRESENSI & JADWAL (NODE:TEST & FETCH BAWAAN)
// Menguji autentikasi token, hak akses role dosen vs mahasiswa, serta skenario presensi
// ============================================================================

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";

let server;
let baseUrl;
let tokenMahasiswa;
let tokenDosen;

// Dummy JPEG valid (magic bytes: FF D8 FF)
const DUMMY_JPEG = Buffer.from([
  0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00,
  0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C,
  0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12, 0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
  0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
  0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01,
  0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0xFF, 0xDA, 0x00, 0x08, 0x01,
  0x01, 0x00, 0x00, 0x3F, 0x00, 0x7F, 0x00, 0xFF, 0xD9,
]);

before(async () => {
  // Jalankan server di port acak (0) untuk pengujian terisolasi
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;

  // 1. Login akun mahasiswa (Ahmad Farhan Fitrian)
  const loginMhsRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "101012300373",
      password: "mahasiswa123",
      role: "mahasiswa",
    }),
  });
  const mhsData = await loginMhsRes.json();
  tokenMahasiswa = mhsData.token;

  // 2. Login akun dosen (Dr. Bayu Rima Pratama)
  const loginDosenRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "BRP",
      password: "dosen123",
      role: "dosen",
    }),
  });
  const dosenData = await loginDosenRes.json();
  tokenDosen = dosenData.token;

  // 3. Simpan persetujuan biometrik mahasiswa
  await fetch(`${baseUrl}/api/wajah/persetujuan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenMahasiswa}`,
    },
    body: JSON.stringify({ setuju: true }),
  });

  // 4. Daftarkan 3 sampel foto wajah agar lolos validasi WAJIB_DAFTAR_WAJAH
  const formSample = new FormData();
  formSample.append("foto", new Blob([DUMMY_JPEG], { type: "image/jpeg" }), "sample1.jpg");
  formSample.append("foto", new Blob([DUMMY_JPEG], { type: "image/jpeg" }), "sample2.jpg");
  formSample.append("foto", new Blob([DUMMY_JPEG], { type: "image/jpeg" }), "sample3.jpg");

  await fetch(`${baseUrl}/api/wajah/daftar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenMahasiswa}` },
    body: formSample,
  });
});

after(async () => {
  // Matikan waktu simulasi dan bersihkan data pengujian
  await fetch(`${baseUrl}/api/dev/waktu`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ waktu: null }),
  });
  await fetch(`${baseUrl}/api/wajah`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenMahasiswa}` },
  });
  await new Promise((resolve) => server.close(resolve));
});

describe("4. Pengujian Autentikasi & Hak Akses Role Endpoint Presensi", () => {
  test("Memanggil endpoint jadwal tanpa token menghasilkan HTTP 401", async () => {
    const res = await fetch(`${baseUrl}/api/jadwal/hari-ini`);
    assert.strictEqual(res.status, 401);
  });

  test("Memanggil endpoint presensi tanpa token menghasilkan HTTP 401", async () => {
    const res = await fetch(`${baseUrl}/api/presensi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jadwalId: 1, lat: -6.9856, lng: 107.6331, accuracy: 10 }),
    });
    assert.strictEqual(res.status, 401);
  });

  test("Akun dosen mencoba memanggil endpoint presensi mahasiswa ditolak dengan HTTP 403", async () => {
    const res = await fetch(`${baseUrl}/api/presensi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenDosen}`,
      },
      body: JSON.stringify({ jadwalId: 1, lat: -6.9856, lng: 107.6331, accuracy: 10 }),
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.ok(body.message.includes("Dibutuhkan peran mahasiswa"));
  });
});

describe("5. Pengujian Skenario Validasi Presensi Server", () => {
  test("Input tidak valid (koordinat NaN / jadwalId salah) menghasilkan HTTP 400 INPUT_TIDAK_VALID", async () => {
    const res = await fetch(`${baseUrl}/api/presensi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenMahasiswa}`,
      },
      body: JSON.stringify({ jadwalId: "salah", lat: "bukan_angka", lng: 107.6331, accuracy: 10 }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.code, "INPUT_TIDAK_VALID");
  });

  test("Akurasi GPS lebih buruk dari MAX_AKURASI_METER (120m > 100m) menghasilkan HTTP 422 AKURASI_BURUK", async () => {
    // Set waktu ke Senin 12 Okt 2026 pukul 14:35 (+07:00) agar berada di hari & jam kuliah AZK4BAA2
    await fetch(`${baseUrl}/api/dev/waktu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waktu: "2026-10-12T14:35:00+07:00" }),
    });

    const res = await fetch(`${baseUrl}/api/presensi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenMahasiswa}`,
      },
      body: JSON.stringify({ jadwalId: 1, lat: -6.9856, lng: 107.6331, accuracy: 120 }),
    });
    assert.strictEqual(res.status, 422);
    const body = await res.json();
    assert.strictEqual(body.code, "AKURASI_BURUK");
  });

  test("Presensi di luar radius (~340m > 30m) menghasilkan HTTP 403 DI_LUAR_AREA dan tidak tersimpan", async () => {
    const res = await fetch(`${baseUrl}/api/presensi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenMahasiswa}`,
      },
      body: JSON.stringify({ jadwalId: 1, lat: -6.9880, lng: 107.6350, accuracy: 10 }),
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.code, "DI_LUAR_AREA");
    assert.ok(body.jarakMeter > 30);
  });

  test("Presensi di luar jendela jam perkuliahan menghasilkan HTTP 409 DI_LUAR_WAKTU", async () => {
    // Set waktu ke Senin 12 Okt 2026 pukul 17:00 (+07:00) - kuliah selesai pukul 16:30
    await fetch(`${baseUrl}/api/dev/waktu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waktu: "2026-10-12T17:00:00+07:00" }),
    });

    const res = await fetch(`${baseUrl}/api/presensi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenMahasiswa}`,
      },
      body: JSON.stringify({ jadwalId: 1, lat: -6.9856, lng: 107.6331, accuracy: 10 }),
    });
    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.code, "DI_LUAR_WAKTU");
  });

  test("Presensi pada hari yang bukan jadwal kuliah menghasilkan HTTP 409 BUKAN_HARI_KULIAH", async () => {
    // Set waktu ke Rabu 14 Okt 2026 pukul 14:35 (+07:00) - jadwal AZK4BAA2 adalah Senin
    await fetch(`${baseUrl}/api/dev/waktu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waktu: "2026-10-14T14:35:00+07:00" }),
    });

    const res = await fetch(`${baseUrl}/api/presensi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenMahasiswa}`,
      },
      body: JSON.stringify({ jadwalId: 1, lat: -6.9856, lng: 107.6331, accuracy: 10 }),
    });
    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.code, "BUKAN_HARI_KULIAH");
  });

  test("Presensi valid dalam radius pada jam kuliah menghasilkan HTTP 201 dengan status hadir", async () => {
    // Set waktu ke Senin 12 Okt 2026 pukul 14:35 (+07:00)
    await fetch(`${baseUrl}/api/dev/waktu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waktu: "2026-10-12T14:35:00+07:00" }),
    });

    const formPresensi = new FormData();
    formPresensi.append("jadwalId", "1");
    formPresensi.append("lat", "-6.9856");
    formPresensi.append("lng", "107.6331");
    formPresensi.append("accuracy", "10");
    formPresensi.append("foto", new Blob([DUMMY_JPEG], { type: "image/jpeg" }), "presensi.jpg");

    const res = await fetch(`${baseUrl}/api/presensi`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenMahasiswa}`,
      },
      body: formPresensi,
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.presensi.status, "hadir");
    assert.strictEqual(body.presensi.jarakMeter, 0);
  });

  test("Presensi valid dalam radius setelah toleransi 15 menit (+18m) menghasilkan status terlambat", async () => {
    // Set waktu ke Senin 12 Okt 2026 pukul 14:48 (+07:00)
    await fetch(`${baseUrl}/api/dev/waktu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waktu: "2026-10-12T14:48:00+07:00" }),
    });

    const formPresensi = new FormData();
    formPresensi.append("jadwalId", "1");
    formPresensi.append("lat", "-6.9856");
    formPresensi.append("lng", "107.6331");
    formPresensi.append("accuracy", "10");
    formPresensi.append("foto", new Blob([DUMMY_JPEG], { type: "image/jpeg" }), "presensi.jpg");

    const res = await fetch(`${baseUrl}/api/presensi`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenMahasiswa}`,
      },
      body: formPresensi,
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.presensi.status, "terlambat");
    assert.strictEqual(body.presensi.selisihMenit, 18);
  });

  test("Reset presensi hari ini via DELETE /api/dev/presensi/hari-ini berhasil membersihkan database", async () => {
    const res = await fetch(`${baseUrl}/api/dev/presensi/hari-ini`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenMahasiswa}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.message, "Data presensi hari ini berhasil dibersihkan");
  });
});
