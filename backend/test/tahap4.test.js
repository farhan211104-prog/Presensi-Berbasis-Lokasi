// ============================================================================
// PENGUJIAN OTOMATIS TAHAP 4: UPLOAD FOTO WAJAH & SIMULASI FACE RECOGNITION
// Menggunakan node:test bawaan Node.js tanpa dependensi tambahan
// ============================================================================

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "fs";
import path from "path";
import app from "../src/app.js";
import { deteksiTipeGambar } from "../src/utils/upload.js";
import { setStubFaceService, resetStubFaceService } from "../src/services/faceService.js";
import { UPLOAD_DIR } from "../src/config/env.js";

let server;
let baseUrl;
let tokenMahasiswa1; // Ahmad Farhan Fitrian (id: 2)
let tokenMahasiswa2; // Mahasiswa lain (id: 4)
let tokenDosen;

// Magic bytes JPEG valid (FF D8 FF)
const VALID_JPEG = Buffer.from([
  0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00,
  0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C,
  0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12, 0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
  0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
  0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01,
  0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0xFF, 0xDA, 0x00, 0x08, 0x01,
  0x01, 0x00, 0x00, 0x3F, 0x00, 0x7F, 0x00, 0xFF, 0xD9,
]);

// Magic bytes PNG valid (89 50 4E 47)
const VALID_PNG = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
  0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
  0x42, 0x60, 0x82,
]);

// File teks palsu
const FAKE_FILE = Buffer.from("Ini adalah teks biasa yang pura-pura jadi foto wajah.");

// Helper untuk menghitung total file di sebuah direktori
function countFilesInDir(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let count = 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      count += countFilesInDir(fullPath);
    } else {
      count += 1;
    }
  }
  return count;
}

before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;

  // 1. Login Mahasiswa 1 (101012300373)
  const loginRes1 = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "101012300373",
      password: "mahasiswa123",
      role: "mahasiswa",
    }),
  });
  const data1 = await loginRes1.json();
  tokenMahasiswa1 = data1.token;

  // 2. Login Mahasiswa 2 (101012300145 - Budi Santoso)
  const loginRes2 = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "101012300145",
      password: "mahasiswa123",
      role: "mahasiswa",
    }),
  });
  const data2 = await loginRes2.json();
  tokenMahasiswa2 = data2.token;

  // 3. Login Dosen (BRP)
  const loginDosenRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "BRP",
      password: "dosen123",
      role: "dosen",
    }),
  });
  const dataDosen = await loginDosenRes.json();
  tokenDosen = dataDosen.token;

  // Bersihkan data awal pengujian
  await fetch(`${baseUrl}/api/wajah`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenMahasiswa1}` },
  });
  await fetch(`${baseUrl}/api/wajah`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenMahasiswa2}` },
  });
});

after(async () => {
  resetStubFaceService();
  await fetch(`${baseUrl}/api/dev/waktu`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ waktu: null }),
  });
  await fetch(`${baseUrl}/api/wajah`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenMahasiswa1}` },
  });
  await fetch(`${baseUrl}/api/wajah`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenMahasiswa2}` },
  });
  await new Promise((resolve) => server.close(resolve));
});

// ============================================================================
// 1. PENGUJIAN FUNGSI MURNI deteksiTipeGambar
// ============================================================================
describe("Tahap 4 - 1. Validasi Magic Bytes deteksiTipeGambar", () => {
  test("Buffer JPEG valid terdeteksi sebagai image/jpeg (.jpg)", () => {
    const hasil = deteksiTipeGambar(VALID_JPEG);
    assert.ok(hasil);
    assert.strictEqual(hasil.ekstensi, "jpg");
    assert.strictEqual(hasil.mime, "image/jpeg");
  });

  test("Buffer PNG valid terdeteksi sebagai image/png (.png)", () => {
    const hasil = deteksiTipeGambar(VALID_PNG);
    assert.ok(hasil);
    assert.strictEqual(hasil.ekstensi, "png");
    assert.strictEqual(hasil.mime, "image/png");
  });

  test("File teks pura-pura .jpg ditolak (mengembalikan null)", () => {
    const hasil = deteksiTipeGambar(FAKE_FILE);
    assert.strictEqual(hasil, null);
  });

  test("Buffer kosong ditolak (mengembalikan null)", () => {
    const hasil = deteksiTipeGambar(Buffer.alloc(0));
    assert.strictEqual(hasil, null);
  });

  test("Input non-Buffer ditolak (mengembalikan null)", () => {
    assert.strictEqual(deteksiTipeGambar(null), null);
    assert.strictEqual(deteksiTipeGambar("string bukan buffer"), null);
    assert.strictEqual(deteksiTipeGambar(undefined), null);
  });
});

// ============================================================================
// 2. PENGUJIAN ENDPOINT PENDAFTARAN SAMPLE WAJAH
// ============================================================================
describe("Tahap 4 - 2. Endpoint Pendaftaran Sampel Wajah", () => {
  let sampleIdTersimpan = null;

  test("Status awal mahasiswa: belum daftar dan belum menyetujui biometrik", async () => {
    const res = await fetch(`${baseUrl}/api/wajah/status`, {
      headers: { Authorization: `Bearer ${tokenMahasiswa1}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.sudahDaftar, false);
    assert.strictEqual(body.jumlahSample, 0);
    assert.strictEqual(body.targetSample, 3);
    assert.strictEqual(body.disetujui, false);
    assert.deepStrictEqual(body.daftarSample, []);
  });

  test("Mendaftar sampel wajah tanpa persetujuan ditolak dengan 403 BELUM_SETUJU", async () => {
    const form = new FormData();
    form.append("foto", new Blob([VALID_JPEG], { type: "image/jpeg" }), "1.jpg");
    form.append("foto", new Blob([VALID_JPEG], { type: "image/jpeg" }), "2.jpg");
    form.append("foto", new Blob([VALID_JPEG], { type: "image/jpeg" }), "3.jpg");

    const res = await fetch(`${baseUrl}/api/wajah/daftar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenMahasiswa1}` },
      body: form,
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.code, "BELUM_SETUJU");
  });

  test("Menyetujui biometrik via POST /api/wajah/persetujuan berhasil", async () => {
    const res = await fetch(`${baseUrl}/api/wajah/persetujuan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenMahasiswa1}`,
      },
      body: JSON.stringify({ setuju: true }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.disetujui, true);
  });

  test("Pendaftaran dengan jumlah file salah (hanya 2 foto) ditolak dengan 400 JUMLAH_FILE_SALAH", async () => {
    const form = new FormData();
    form.append("foto", new Blob([VALID_JPEG], { type: "image/jpeg" }), "1.jpg");
    form.append("foto", new Blob([VALID_JPEG], { type: "image/jpeg" }), "2.jpg");

    const res = await fetch(`${baseUrl}/api/wajah/daftar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenMahasiswa1}` },
      body: form,
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.code, "JUMLAH_FILE_SALAH");
  });

  test("Pendaftaran dengan file palsu (bukan JPEG/PNG) ditolak dengan 400 FILE_TIDAK_VALID", async () => {
    const form = new FormData();
    form.append("foto", new Blob([VALID_JPEG], { type: "image/jpeg" }), "1.jpg");
    form.append("foto", new Blob([FAKE_FILE], { type: "image/jpeg" }), "2.jpg"); // palsu
    form.append("foto", new Blob([VALID_JPEG], { type: "image/jpeg" }), "3.jpg");

    const res = await fetch(`${baseUrl}/api/wajah/daftar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenMahasiswa1}` },
      body: form,
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.code, "FILE_TIDAK_VALID");
  });

  test("Pendaftaran dengan file melebihi batas (2.5 MB > 2 MB) ditolak dengan 413 FILE_TERLALU_BESAR", async () => {
    const largeBuffer = Buffer.alloc(2.5 * 1024 * 1024, 0);
    VALID_JPEG.copy(largeBuffer, 0, 0, VALID_JPEG.length);

    const form = new FormData();
    form.append("foto", new Blob([VALID_JPEG], { type: "image/jpeg" }), "1.jpg");
    form.append("foto", new Blob([largeBuffer], { type: "image/jpeg" }), "2.jpg"); // > 2MB
    form.append("foto", new Blob([VALID_JPEG], { type: "image/jpeg" }), "3.jpg");

    const res = await fetch(`${baseUrl}/api/wajah/daftar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenMahasiswa1}` },
      body: form,
    });
    assert.strictEqual(res.status, 413);
    const body = await res.json();
    assert.strictEqual(body.code, "FILE_TERLALU_BESAR");
  });

  test("Pendaftaran 3 foto valid sukses atomik dan status menunjukkan sudahDaftar === true", async () => {
    const form = new FormData();
    form.append("foto", new Blob([VALID_JPEG], { type: "image/jpeg" }), "lurus.jpg");
    form.append("foto", new Blob([VALID_PNG], { type: "image/png" }), "kiri.png");
    form.append("foto", new Blob([VALID_JPEG], { type: "image/jpeg" }), "kanan.jpg");

    const res = await fetch(`${baseUrl}/api/wajah/daftar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenMahasiswa1}` },
      body: form,
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.totalSample, 3);
    assert.strictEqual(body.samples.length, 3);

    sampleIdTersimpan = body.samples[0].id;

    // Cek GET /api/wajah/status
    const statusRes = await fetch(`${baseUrl}/api/wajah/status`, {
      headers: { Authorization: `Bearer ${tokenMahasiswa1}` },
    });
    assert.strictEqual(statusRes.status, 200);
    const statusBody = await statusRes.json();
    assert.strictEqual(statusBody.sudahDaftar, true);
    assert.strictEqual(statusBody.jumlahSample, 3);
    assert.strictEqual(statusBody.daftarSample.length, 3);
  });

  test("Mengambil gambar sample milik sendiri mengembalikan 200 dengan header privasi aman", async () => {
    assert.ok(sampleIdTersimpan);
    const res = await fetch(`${baseUrl}/api/wajah/sample/${sampleIdTersimpan}/gambar`, {
      headers: { Authorization: `Bearer ${tokenMahasiswa1}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get("Cache-Control"), "private, no-store");
    assert.strictEqual(res.headers.get("X-Content-Type-Options"), "nosniff");
    const buffer = Buffer.from(await res.arrayBuffer());
    assert.strictEqual(buffer.length, VALID_JPEG.length);
  });

  test("Pengguna lain mencoba mengakses gambar sample ditolak 404 (bukan 403)", async () => {
    assert.ok(sampleIdTersimpan);
    const res = await fetch(`${baseUrl}/api/wajah/sample/${sampleIdTersimpan}/gambar`, {
      headers: { Authorization: `Bearer ${tokenMahasiswa2}` },
    });
    assert.strictEqual(res.status, 404);
  });

  test("Mengakses gambar sample tanpa token ditolak dengan 401", async () => {
    assert.ok(sampleIdTersimpan);
    const res = await fetch(`${baseUrl}/api/wajah/sample/${sampleIdTersimpan}/gambar`);
    assert.strictEqual(res.status, 401);
  });

  test("Pendaftaran ulang menggantikan sample lama dan menghapus file lama dari disk", async () => {
    const uploadsSubdir = path.resolve(UPLOAD_DIR, "wajah-sample");
    const countSebelum = countFilesInDir(uploadsSubdir);

    const form = new FormData();
    form.append("foto", new Blob([VALID_PNG], { type: "image/png" }), "ulang1.png");
    form.append("foto", new Blob([VALID_PNG], { type: "image/png" }), "ulang2.png");
    form.append("foto", new Blob([VALID_PNG], { type: "image/png" }), "ulang3.png");

    const res = await fetch(`${baseUrl}/api/wajah/daftar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenMahasiswa1}` },
      body: form,
    });
    assert.strictEqual(res.status, 201);

    const countSesudah = countFilesInDir(uploadsSubdir);
    // Jumlah file tidak boleh berlipat ganda karena file lama telah dibersihkan
    assert.strictEqual(countSesudah, countSebelum);
  });

  test("Hak hapus data (DELETE /api/wajah) membersihkan baris DB dan file di disk", async () => {
    const res = await fetch(`${baseUrl}/api/wajah`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenMahasiswa1}` },
    });
    assert.strictEqual(res.status, 200);

    const statusRes = await fetch(`${baseUrl}/api/wajah/status`, {
      headers: { Authorization: `Bearer ${tokenMahasiswa1}` },
    });
    const statusBody = await statusRes.json();
    assert.strictEqual(statusBody.sudahDaftar, false);
    assert.strictEqual(statusBody.jumlahSample, 0);
  });
});

// ============================================================================
// 3. PENGUJIAN ENDPOINT PRESENSI DENGAN FOTO WAJAH
// ============================================================================
describe("Tahap 4 - 3. Endpoint Presensi dengan Foto Wajah & Face Recognition", () => {
  before(async () => {
    // Daftarkan kembali sampel wajah mahasiswa 1 untuk pengujian presensi
    await fetch(`${baseUrl}/api/wajah/persetujuan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenMahasiswa1}`,
      },
      body: JSON.stringify({ setuju: true }),
    });

    const form = new FormData();
    form.append("foto", new Blob([VALID_JPEG], { type: "image/jpeg" }), "1.jpg");
    form.append("foto", new Blob([VALID_JPEG], { type: "image/jpeg" }), "2.jpg");
    form.append("foto", new Blob([VALID_JPEG], { type: "image/jpeg" }), "3.jpg");

    await fetch(`${baseUrl}/api/wajah/daftar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenMahasiswa1}` },
      body: form,
    });
  });

  test("Mahasiswa 2 (belum daftar wajah) presensi ditolak dengan 409 WAJAH_BELUM_DAFTAR", async () => {
    // Set waktu kuliah Senin 12 Okt 2026 pukul 14:35
    await fetch(`${baseUrl}/api/dev/waktu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waktu: "2026-10-12T14:35:00+07:00" }),
    });

    const form = new FormData();
    form.append("jadwalId", "1");
    form.append("lat", "-6.9856");
    form.append("lng", "107.6331");
    form.append("accuracy", "10");
    form.append("foto", new Blob([VALID_JPEG], { type: "image/jpeg" }), "foto.jpg");

    const res = await fetch(`${baseUrl}/api/presensi`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenMahasiswa2}` },
      body: form,
    });
    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.code, "WAJAH_BELUM_DAFTAR");
  });

  test("Presensi tanpa melampirkan file foto ditolak dengan 400 FILE_TIDAK_VALID", async () => {
    const form = new FormData();
    form.append("jadwalId", "1");
    form.append("lat", "-6.9856");
    form.append("lng", "107.6331");
    form.append("accuracy", "10");

    const res = await fetch(`${baseUrl}/api/presensi`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenMahasiswa1}` },
      body: form,
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.code, "FILE_TIDAK_VALID");
  });

  test("Presensi ditolak di luar radius TIDAK meninggalkan file foto di uploads", async () => {
    const presensiDir = path.resolve(UPLOAD_DIR, "presensi");
    const countSebelum = countFilesInDir(presensiDir);

    const form = new FormData();
    form.append("jadwalId", "1");
    form.append("lat", "-6.9880"); // ~340 meter di luar radius 30m
    form.append("lng", "107.6350");
    form.append("accuracy", "10");
    form.append("foto", new Blob([VALID_JPEG], { type: "image/jpeg" }), "luar_area.jpg");

    const res = await fetch(`${baseUrl}/api/presensi`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenMahasiswa1}` },
      body: form,
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.code, "DI_LUAR_AREA");

    const countSesudah = countFilesInDir(presensiDir);
    assert.strictEqual(countSesudah, countSebelum, "Presensi yang ditolak tidak boleh meninggalkan file foto");
  });

  test("Presensi ditolak 403 WAJAH_TIDAK_COCOK saat faceService stub dioverride dan tidak meninggalkan file", async () => {
    // Injeksi stub agar tidak cocok (skor 0.3 < ambang batas 0.8)
    setStubFaceService({ cocok: false, skor: 0.3, metode: "stub-override-test" });

    const presensiDir = path.resolve(UPLOAD_DIR, "presensi");
    const countSebelum = countFilesInDir(presensiDir);

    const form = new FormData();
    form.append("jadwalId", "1");
    form.append("lat", "-6.9856");
    form.append("lng", "107.6331");
    form.append("accuracy", "10");
    form.append("foto", new Blob([VALID_JPEG], { type: "image/jpeg" }), "wajah_lain.jpg");

    const res = await fetch(`${baseUrl}/api/presensi`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenMahasiswa1}` },
      body: form,
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.code, "WAJAH_TIDAK_COCOK");

    const countSesudah = countFilesInDir(presensiDir);
    assert.strictEqual(countSesudah, countSebelum, "Verifikasi wajah gagal tidak boleh meninggalkan file di uploads");

    // Kembalikan stub ke kondisi simulasi default
    resetStubFaceService();
  });

  let presensiSuksesId = null;

  test("Presensi sukses validasi menyimpan foto_path dan skor_wajah ke database", async () => {
    // Set waktu ke jam kuliah aktif Senin 12 Okt 2026 14:35
    await fetch(`${baseUrl}/api/dev/waktu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waktu: "2026-10-12T14:35:00+07:00" }),
    });

    // Bersihkan jika ada presensi sebelumnya di hari ini
    await fetch(`${baseUrl}/api/dev/presensi/hari-ini`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenMahasiswa1}` },
    });

    const form = new FormData();
    form.append("jadwalId", "1");
    form.append("lat", "-6.9856");
    form.append("lng", "107.6331");
    form.append("accuracy", "10");
    form.append("foto", new Blob([VALID_JPEG], { type: "image/jpeg" }), "presensi_sukses.jpg");

    const res = await fetch(`${baseUrl}/api/presensi`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenMahasiswa1}` },
      body: form,
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.presensi.status, "hadir");
    assert.ok(body.presensi.fotoUrl);
    assert.strictEqual(body.presensi.skorWajah, 1);

    presensiSuksesId = body.presensi.id;
  });

  test("Mengambil foto presensi (GET /api/presensi/:id/foto) oleh pemilik berhasil 200 dengan header aman", async () => {
    assert.ok(presensiSuksesId);
    const res = await fetch(`${baseUrl}/api/presensi/${presensiSuksesId}/foto`, {
      headers: { Authorization: `Bearer ${tokenMahasiswa1}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get("Cache-Control"), "private, no-store");
    assert.strictEqual(res.headers.get("X-Content-Type-Options"), "nosniff");
  });

  test("Pengguna lain mencoba mengakses foto presensi ditolak dengan 404", async () => {
    assert.ok(presensiSuksesId);
    const res = await fetch(`${baseUrl}/api/presensi/${presensiSuksesId}/foto`, {
      headers: { Authorization: `Bearer ${tokenMahasiswa2}` },
    });
    assert.strictEqual(res.status, 404);
  });

  test("Mengakses foto presensi tanpa token ditolak dengan 401", async () => {
    assert.ok(presensiSuksesId);
    const res = await fetch(`${baseUrl}/api/presensi/${presensiSuksesId}/foto`);
    assert.strictEqual(res.status, 401);
  });
});
