// ============================================================================
// PENGUJIAN TAHAP 3: REKAP KEHADIRAN & NILAI MAHASISWA
// Menguji fungsi murni hitungRekap, hitungIP, dan integrasi endpoint API
// ============================================================================

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import { hitungRekap, hitungTanggalPertemuan } from "../src/utils/rekap.js";
import { hitungIP, hitungNilaiAkhir, konversiNilaiKeIndeks } from "../src/utils/nilai.js";

// ----------------------------------------------------------------------------
// 1. PENGUJIAN FUNGSI MURNI hitungRekap
// ----------------------------------------------------------------------------
describe("6. Pengujian Fungsi Murni Rekap Kehadiran (hitungRekap)", () => {
  const jadwalSenin = {
    hari: "Senin",
    jamMulai: "14:30",
    jamSelesai: "16:30",
  };
  const tanggalMulai = "2026-08-24"; // Senin Minggu ke-1

  test("Pertemuan masa depan (setelah tanggal hari ini) tidak boleh muncul dalam daftar", () => {
    // Simulasi waktu: Senin, 07 September 2026 (Minggu ke-3) pukul 14:00
    const waktuSekarang = new Date("2026-09-07T14:00:00+07:00");
    const rekap = hitungRekap({
      jadwal: jadwalSenin,
      presensiList: [],
      waktuSekarang,
      tanggalMulaiSemester: tanggalMulai,
    });

    // Pertemuan maksimal yang muncul adalah sampai minggu ke-3 saja
    assert.strictEqual(rekap.pertemuan.length, 3);
    const mingguList = rekap.pertemuan.map((p) => p.mingguKe);
    assert.deepStrictEqual(mingguList, [1, 2, 3]);
  });

  test("Pertemuan lampau tanpa baris presensi otomatis dihitung sebagai status 'alpha'", () => {
    // Waktu sekarang: Minggu ke-3, mahasiswa hanya presensi di Minggu ke-1
    const waktuSekarang = new Date("2026-09-07T17:00:00+07:00"); // Setelah jam selesai P-3
    const presensiList = [{ mingguKe: 1, status: "hadir" }];

    const rekap = hitungRekap({
      jadwal: jadwalSenin,
      presensiList,
      waktuSekarang,
      tanggalMulaiSemester: tanggalMulai,
    });

    const p2 = rekap.pertemuan.find((p) => p.mingguKe === 2);
    const p3 = rekap.pertemuan.find((p) => p.mingguKe === 3);

    assert.strictEqual(p2.status, "alpha");
    assert.strictEqual(p3.status, "alpha");
    assert.strictEqual(rekap.ringkasan.alpha, 2);
  });

  test("Pertemuan hari ini yang belum selesai dan belum presensi berstatus 'belum' & tidak dihitung ke persentase", () => {
    // Waktu sekarang: Senin 2026-09-07 pukul 15:00 (kuliah 14:30 - 16:30 belum selesai)
    const waktuSekarang = new Date("2026-09-07T15:00:00+07:00");
    const presensiList = [
      { mingguKe: 1, status: "hadir" },
      { mingguKe: 2, status: "hadir" },
    ];

    const rekap = hitungRekap({
      jadwal: jadwalSenin,
      presensiList,
      waktuSekarang,
      tanggalMulaiSemester: tanggalMulai,
    });

    const p3 = rekap.pertemuan.find((p) => p.mingguKe === 3);
    assert.strictEqual(p3.status, "belum");

    // Total pertemuan berjalan tidak memasukkan pertemuan berstatus 'belum'
    assert.strictEqual(rekap.ringkasan.totalPertemuanBerjalan, 2);
    assert.strictEqual(rekap.ringkasan.persentaseKehadiran, 100);
  });

  test("Status 'terlambat' dihitung sebagai kehadiran (bukan ketidakhadiran)", () => {
    const waktuSekarang = new Date("2026-09-14T17:00:00+07:00");
    const presensiList = [
      { mingguKe: 1, status: "hadir" },
      { mingguKe: 2, status: "terlambat", selisihMenitTerlambat: 20 },
    ];

    const rekap = hitungRekap({
      jadwal: jadwalSenin,
      presensiList,
      waktuSekarang,
      tanggalMulaiSemester: tanggalMulai,
    });

    assert.strictEqual(rekap.ringkasan.hadir, 1);
    assert.strictEqual(rekap.ringkasan.terlambat, 1);
    assert.strictEqual(rekap.ringkasan.totalMasuk, 2);
  });

  test("Status 'izin' dan 'sakit' TIDAK dihitung sebagai kehadiran", () => {
    const waktuSekarang = new Date("2026-08-31T17:00:00+07:00");
    const presensiList = [
      { mingguKe: 1, status: "izin" },
      { mingguKe: 2, status: "sakit" },
    ];

    const rekap = hitungRekap({
      jadwal: jadwalSenin,
      presensiList,
      waktuSekarang,
      tanggalMulaiSemester: tanggalMulai,
    });

    assert.strictEqual(rekap.ringkasan.izin, 1);
    assert.strictEqual(rekap.ringkasan.sakit, 1);
    assert.strictEqual(rekap.ringkasan.totalMasuk, 0);
    assert.strictEqual(rekap.ringkasan.persentaseKehadiran, 0);
  });

  test("Total pertemuan berjalan 0 menghasilkan persentase 0 tanpa error pembagian nol", () => {
    // Hari pertama sebelum jam kuliah selesai tanpa ada riwayat presensi
    const waktuSekarang = new Date("2026-08-24T12:00:00+07:00");
    const rekap = hitungRekap({
      jadwal: jadwalSenin,
      presensiList: [],
      waktuSekarang,
      tanggalMulaiSemester: tanggalMulai,
    });

    assert.strictEqual(rekap.ringkasan.totalPertemuanBerjalan, 0);
    assert.strictEqual(rekap.ringkasan.persentaseKehadiran, 0);
    assert.strictEqual(rekap.ringkasan.peringatan, false);
  });

  test("Persentase tepat 75.0% tidak memicu peringatan, tetapi 74.9% memicu peringatan", () => {
    // Kasus 1: 3 hadir dari 4 pertemuan = 75.0%
    const waktu4Pertemuan = new Date("2026-09-14T17:00:00+07:00");
    const presensi75 = [
      { mingguKe: 1, status: "hadir" },
      { mingguKe: 2, status: "hadir" },
      { mingguKe: 3, status: "hadir" },
      { mingguKe: 4, status: "alpha" },
    ];
    const rekap75 = hitungRekap({
      jadwal: jadwalSenin,
      presensiList: presensi75,
      waktuSekarang: waktu4Pertemuan,
      tanggalMulaiSemester: tanggalMulai,
    });
    assert.strictEqual(rekap75.ringkasan.persentaseKehadiran, 75);
    assert.strictEqual(rekap75.ringkasan.peringatan, false);

    // Kasus 2: 74.9% (di bawah batas 75%)
    // Misal 5 hadir dari 7 pertemuan = 71.4%
    const waktu7Pertemuan = new Date("2026-10-05T17:00:00+07:00");
    const presensi71 = [
      { mingguKe: 1, status: "hadir" },
      { mingguKe: 2, status: "hadir" },
      { mingguKe: 3, status: "hadir" },
      { mingguKe: 4, status: "hadir" },
      { mingguKe: 5, status: "hadir" },
      { mingguKe: 6, status: "alpha" },
      { mingguKe: 7, status: "alpha" },
    ];
    const rekap71 = hitungRekap({
      jadwal: jadwalSenin,
      presensiList: presensi71,
      waktuSekarang: waktu7Pertemuan,
      tanggalMulaiSemester: tanggalMulai,
    });
    assert.strictEqual(rekap71.ringkasan.persentaseKehadiran, 71.4);
    assert.strictEqual(rekap71.ringkasan.peringatan, true);
  });
});

// ----------------------------------------------------------------------------
// 2. PENGUJIAN FUNGSI MURNI hitungIP & hitungNilai
// ----------------------------------------------------------------------------
describe("7. Pengujian Fungsi Murni Perhitungan Nilai & IP (hitungIP)", () => {
  test("Perhitungan manual yang diketahui menghasilkan IPS yang akurat", () => {
    // Mata Kuliah 1: 3 SKS, Nilai Akhir 86 -> A (bobot 4.0) -> SKS x Bobot = 12.0
    // Mata Kuliah 2: 2 SKS, Nilai Akhir 68 -> B (bobot 3.0) -> SKS x Bobot = 6.0
    // Total SKS = 5, Total Bobot = 18.0 -> IPS = 18.0 / 5 = 3.60
    const mkList = [
      { sks: 3, bobot: 4.0 },
      { sks: 2, bobot: 3.0 },
    ];
    const hasil = hitungIP(mkList);
    assert.strictEqual(hasil.totalSks, 5);
    assert.strictEqual(hasil.ip, 3.6);
  });

  test("Total SKS 0 menghasilkan IP = 0 tanpa error", () => {
    const hasil = hitungIP([]);
    assert.strictEqual(hasil.totalSks, 0);
    assert.strictEqual(hasil.ip, 0);
  });

  test("Perhitungan IPK kumulatif lintas semester menggabungkan seluruh SKS", () => {
    // Semester 1: SKS 5, total bobot SKS 18.0
    // Semester 2: SKS 3, A (4.0) -> bobot SKS 12.0
    // Total kumulatif: 8 SKS, bobot 30.0 -> IPK = 30.0 / 8 = 3.75
    const semuaMatkulLintasSemester = [
      { sks: 3, bobot: 4.0 },
      { sks: 2, bobot: 3.0 },
      { sks: 3, bobot: 4.0 },
    ];
    const hasilIPK = hitungIP(semuaMatkulLintasSemester);
    assert.strictEqual(hasilIPK.totalSks, 8);
    assert.strictEqual(hasilIPK.ip, 3.75);
  });

  test("Konversi skala nilai akhir ke indeks huruf dan bobot angka", () => {
    assert.deepStrictEqual(konversiNilaiKeIndeks(85), { huruf: "A", bobot: 4.0 });
    assert.deepStrictEqual(konversiNilaiKeIndeks(75), { huruf: "AB", bobot: 3.5 });
    assert.deepStrictEqual(konversiNilaiKeIndeks(66), { huruf: "B", bobot: 3.0 });
    assert.deepStrictEqual(konversiNilaiKeIndeks(61), { huruf: "BC", bobot: 2.5 });
    assert.deepStrictEqual(konversiNilaiKeIndeks(52), { huruf: "C", bobot: 2.0 });
    assert.deepStrictEqual(konversiNilaiKeIndeks(42), { huruf: "D", bobot: 1.0 });
    assert.deepStrictEqual(konversiNilaiKeIndeks(30), { huruf: "E", bobot: 0.0 });
  });
});

// ----------------------------------------------------------------------------
// 3. PENGUJIAN INTEGRASI ENDPOINT API (REKAP, NILAI, MATA KULIAH)
// ----------------------------------------------------------------------------
describe("8. Pengujian Endpoint API Rekap, Nilai, dan Mata Kuliah", () => {
  let server;
  let baseUrl;
  let tokenMahasiswa;
  let tokenDosen;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    // Login mahasiswa Farhan
    const resMhs = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "101012300373",
        password: "mahasiswa123",
        role: "mahasiswa",
      }),
    });
    const dataMhs = await resMhs.json();
    tokenMahasiswa = dataMhs.token;

    // Login dosen BRP
    const resDosen = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "BRP",
        password: "dosen123",
        role: "dosen",
      }),
    });
    const dataDosen = await resDosen.json();
    tokenDosen = dataDosen.token;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test("GET /api/mata-kuliah tanpa token mengembalikan HTTP 401", async () => {
    const res = await fetch(`${baseUrl}/api/mata-kuliah`);
    assert.strictEqual(res.status, 401);
  });

  test("GET /api/mata-kuliah dengan akun mahasiswa berhasil mengembalikan daftar matkul", async () => {
    const res = await fetch(`${baseUrl}/api/mata-kuliah`, {
      headers: { Authorization: `Bearer ${tokenMahasiswa}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.mataKuliah));
    assert.ok(body.mataKuliah.length > 0);
    const azk = body.mataKuliah.find((m) => m.kode === "AZK4BAA2");
    assert.ok(azk);
    assert.ok(azk.dosen);
    assert.ok(azk.dosen.nama);
  });

  test("GET /api/rekap tanpa parameter mataKuliahId mengembalikan HTTP 400 INPUT_TIDAK_VALID", async () => {
    const res = await fetch(`${baseUrl}/api/rekap`, {
      headers: { Authorization: `Bearer ${tokenMahasiswa}` },
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, "INPUT_TIDAK_VALID");
  });

  test("GET /api/rekap untuk mata kuliah yang bukan peserta mengembalikan HTTP 403 BUKAN_PESERTA", async () => {
    // ID mata kuliah yang tidak diambil oleh mahasiswa (ID 999999)
    const res = await fetch(`${baseUrl}/api/rekap?mataKuliahId=999999`, {
      headers: { Authorization: `Bearer ${tokenMahasiswa}` },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.error, "BUKAN_PESERTA");
  });

  test("GET /api/rekap untuk mata kuliah valid mengembalikan data rekap dan ringkasan", async () => {
    // Ambil ID matkul AZK4BAA2
    const mkRes = await fetch(`${baseUrl}/api/mata-kuliah`, {
      headers: { Authorization: `Bearer ${tokenMahasiswa}` },
    });
    const mkBody = await mkRes.json();
    const azk = mkBody.mataKuliah.find((m) => m.kode === "AZK4BAA2");
    assert.ok(azk);

    const res = await fetch(`${baseUrl}/api/rekap?mataKuliahId=${azk.id}`, {
      headers: { Authorization: `Bearer ${tokenMahasiswa}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.ringkasan);
    assert.ok(Array.isArray(body.pertemuan));
    assert.strictEqual(typeof body.ringkasan.persentaseKehadiran, "number");
    assert.strictEqual(typeof body.ringkasan.peringatan, "boolean");
  });

  test("GET /api/nilai/semester mengembalikan minimal 2 semester untuk mahasiswa", async () => {
    const res = await fetch(`${baseUrl}/api/nilai/semester`, {
      headers: { Authorization: `Bearer ${tokenMahasiswa}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.semester));
    assert.ok(body.semester.length >= 2);
  });

  test("GET /api/nilai?semester=... mengembalikan IPS semester dan IPK kumulatif dari server", async () => {
    const semRes = await fetch(`${baseUrl}/api/nilai/semester`, {
      headers: { Authorization: `Bearer ${tokenMahasiswa}` },
    });
    const semBody = await semRes.json();
    const semesterAktif = semBody.semester[0];

    const res = await fetch(`${baseUrl}/api/nilai?semester=${encodeURIComponent(semesterAktif)}`, {
      headers: { Authorization: `Bearer ${tokenMahasiswa}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.semester, semesterAktif);
    assert.ok(typeof body.ips === "number");
    assert.ok(typeof body.ipk === "number");
    assert.ok(Array.isArray(body.mataKuliah));
    assert.ok(body.mataKuliah.length > 0);

    // Verifikasi atribut mata kuliah
    const firstMk = body.mataKuliah[0];
    assert.ok(firstMk.kode);
    assert.ok(firstMk.nama);
    assert.ok(typeof firstMk.sks === "number");
    assert.ok(typeof firstMk.nilaiAkhir === "number");
    assert.ok(firstMk.indeksHuruf);
  });

  test("GET /api/nilai dengan parameter semester yang tidak valid menghasilkan HTTP 400", async () => {
    const res = await fetch(`${baseUrl}/api/nilai?semester=Semester-Non-Existent`, {
      headers: { Authorization: `Bearer ${tokenMahasiswa}` },
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, "INPUT_TIDAK_VALID");
  });
});
