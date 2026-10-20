import fs from "fs";
import path from "path";
import express from "express";
import db from "../db/connection.js";
import { authRequired, roleRequired } from "../middleware/auth.js";
import { presensiRateLimiter } from "../middleware/rateLimiter.js";
import { hitungJarakMeter, isValidCoordinate } from "../utils/geo.js";
import {
  getWaktuSekarang,
  getHariIndonesia,
  getTanggalString,
  getJamMenitString,
  getWaktuISOString,
  parseJamKeMenit,
  hitungMingguKe,
} from "../utils/waktu.js";
import { hitungStatus } from "../utils/statusPresensi.js";
import {
  MAX_AKURASI_METER,
  PRESENSI_BUKA_SEBELUM_MENIT,
  DEV_SESI_SELALU_BUKA,
  DEV_IZINKAN_PRESENSI_ULANG,
  TOLERANSI_TERLAMBAT_MENIT,
  UPLOAD_DIR,
  WAJIB_DAFTAR_WAJAH,
  JUMLAH_SAMPLE_WAJAH,
  FACE_THRESHOLD,
} from "../config/env.js";
import {
  uploadMemory,
  handleMulterError,
  deteksiTipeGambar,
  simpanFotoPresensi,
  hapusFileAman,
} from "../utils/upload.js";
import { verifikasiWajah } from "../services/faceService.js";

const router = express.Router();

// Prepared statement untuk memvalidasi enrollment mahasiswa & mendapatkan detail jadwal
const findJadwalEnrollmentStmt = db.prepare(`
  SELECT
    j.id AS jadwalId,
    j.mata_kuliah_id AS mataKuliahId,
    j.hari AS hari,
    j.jam_mulai AS jamMulai,
    j.jam_selesai AS jamSelesai,
    j.ruangan AS ruangan,
    j.lokasi_nama AS lokasiNama,
    j.lat AS lat,
    j.lng AS lng,
    j.radius_meter AS radiusMeter,
    m.kode AS matkulKode,
    m.nama AS matkulNama
  FROM jadwal j
  JOIN enrollment e ON e.mata_kuliah_id = j.mata_kuliah_id
  JOIN mata_kuliah m ON m.id = j.mata_kuliah_id
  WHERE j.id = ? AND e.mahasiswa_id = ?
`);

// Prepared statement untuk pertemuan kuliah
const findPertemuanStmt = db.prepare(`
  SELECT id, jadwal_id, minggu_ke, tanggal, sesi_dibuka
  FROM pertemuan
  WHERE jadwal_id = ? AND minggu_ke = ?
`);

const insertPertemuanStmt = db.prepare(`
  INSERT INTO pertemuan (jadwal_id, minggu_ke, tanggal, sesi_dibuka, catatan)
  VALUES (?, ?, ?, ?, ?)
`);

// Prepared statement untuk cek presensi yang sudah ada
const findPresensiByPertemuanAndMahasiswaStmt = db.prepare(`
  SELECT id, pertemuan_id, mahasiswa_id, waktu_presensi, status, jarak_meter, foto_path, skor_wajah
  FROM presensi
  WHERE pertemuan_id = ? AND mahasiswa_id = ?
`);

// Prepared statement UPSERT presensi (jika presensi ulang diizinkan saat mode dev)
const upsertPresensiStmt = db.prepare(`
  INSERT INTO presensi (
    pertemuan_id, mahasiswa_id, waktu_presensi, lat, lng,
    jarak_meter, status, metode, diubah_dosen, catatan, foto_path, skor_wajah
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(pertemuan_id, mahasiswa_id) DO UPDATE SET
    waktu_presensi = excluded.waktu_presensi,
    lat = excluded.lat,
    lng = excluded.lng,
    jarak_meter = excluded.jarak_meter,
    status = excluded.status,
    metode = excluded.metode,
    diubah_dosen = excluded.diubah_dosen,
    catatan = excluded.catatan,
    foto_path = excluded.foto_path,
    skor_wajah = excluded.skor_wajah
`);

// Prepared statement INSERT biasa (untuk penegakan UNIQUE constraint)
const insertPresensiStmt = db.prepare(`
  INSERT INTO presensi (
    pertemuan_id, mahasiswa_id, waktu_presensi, lat, lng,
    jarak_meter, status, metode, diubah_dosen, catatan, foto_path, skor_wajah
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Prepared statement untuk menghitung jumlah sampel wajah terdaftar
const countWajahSampleStmt = db.prepare(`
  SELECT COUNT(*) AS total
  FROM wajah_sample
  WHERE mahasiswa_id = ?
`);

// Prepared statement untuk mengambil path sampel wajah terdaftar
const findWajahSamplePathsStmt = db.prepare(`
  SELECT file_path
  FROM wajah_sample
  WHERE mahasiswa_id = ?
  ORDER BY urutan ASC
`);

// Prepared statement untuk mengambil foto presensi berdasarkan ID presensi
const findPresensiByIdStmt = db.prepare(`
  SELECT id, mahasiswa_id, foto_path
  FROM presensi
  WHERE id = ?
`);

/**
 * Helper untuk mendapatkan atau membuat pertemuan minggu ini
 */
function getOrCreatePertemuan(jadwalId, mingguKe, tanggalHariIni) {
  let pert = findPertemuanStmt.get(jadwalId, mingguKe);
  if (!pert) {
    const defaultSesi = DEV_SESI_SELALU_BUKA ? 1 : 0;
    const info = insertPertemuanStmt.run(
      jadwalId,
      mingguKe,
      tanggalHariIni,
      defaultSesi,
      `Perkuliahan Minggu ke-${mingguKe}`
    );
    pert = {
      id: info.lastInsertRowid,
      jadwal_id: jadwalId,
      minggu_ke: mingguKe,
      tanggal: tanggalHariIni,
      sesi_dibuka: defaultSesi,
    };
  }
  return pert;
}

/**
 * POST /api/presensi/cek-lokasi
 * Hanya menghitung jarak & akurasi tanpa menyimpan data.
 * Dipakai oleh frontend untuk memeriksa area sebelum modal kamera dibuka.
 */
router.post(
  "/cek-lokasi",
  authRequired,
  roleRequired("mahasiswa"),
  (req, res, next) => {
    try {
      const { jadwalId, lat, lng, accuracy } = req.body;

      // 1. Validasi input
      const numericJadwalId = Number(jadwalId);
      const numericLat = Number(lat);
      const numericLng = Number(lng);
      const numericAccuracy = Number(accuracy);

      if (
        !Number.isInteger(numericJadwalId) ||
        numericJadwalId <= 0 ||
        !isValidCoordinate(numericLat, numericLng) ||
        typeof accuracy === "undefined" ||
        accuracy === null ||
        !Number.isFinite(numericAccuracy) ||
        numericAccuracy < 0
      ) {
        return res.status(400).json({
          code: "INPUT_TIDAK_VALID",
          message: "Data koordinat GPS atau jadwal tidak valid.",
        });
      }

      // 2. Cek apakah jadwal ada dan mahasiswa terdaftar
      const jadwal = findJadwalEnrollmentStmt.get(numericJadwalId, req.user.id);
      if (!jadwal) {
        return res.status(403).json({
          code: "BUKAN_PESERTA",
          message: "Jadwal kuliah tidak ditemukan atau Anda bukan peserta mata kuliah ini.",
        });
      }

      // 3. Hitung jarak memakai rumus Haversine
      const jarakMeter = hitungJarakMeter(
        numericLat,
        numericLng,
        jadwal.lat,
        jadwal.lng
      );
      const radiusMeter = jadwal.radiusMeter;
      const dalamArea = jarakMeter <= radiusMeter;
      const akurasiMeter = Math.round(numericAccuracy);
      const akurasiBaik = akurasiMeter <= MAX_AKURASI_METER;

      return res.status(200).json({
        jarakMeter,
        radiusMeter,
        dalamArea,
        akurasiMeter,
        akurasiBaik,
        lokasi: {
          nama: jadwal.lokasiNama,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/presensi
 * Menyimpan presensi mahasiswa setelah lolos 8 tahap validasi ketat di sisi server.
 */
router.post(
  "/",
  authRequired,
  roleRequired("mahasiswa"),
  uploadMemory.single("foto"),
  handleMulterError,
  presensiRateLimiter,
  async (req, res, next) => {
    try {
      const { jadwalId, lat, lng, accuracy } = req.body;

      // =======================================================================
      // VALIDASI 1: Input tidak valid -> 400 INPUT_TIDAK_VALID
      // =======================================================================
      const numericJadwalId = Number(jadwalId);
      const numericLat = Number(lat);
      const numericLng = Number(lng);
      const numericAccuracy = Number(accuracy);

      if (
        !Number.isInteger(numericJadwalId) ||
        numericJadwalId <= 0 ||
        !isValidCoordinate(numericLat, numericLng) ||
        typeof accuracy === "undefined" ||
        accuracy === null ||
        !Number.isFinite(numericAccuracy) ||
        numericAccuracy < 0
      ) {
        return res.status(400).json({
          code: "INPUT_TIDAK_VALID",
          message: "Input data presensi tidak valid. Pastikan koordinat dan akurasi GPS terisi dengan benar.",
        });
      }

      // =======================================================================
      // VALIDASI 2: Jadwal tidak ada, atau mahasiswa bukan peserta -> 403 BUKAN_PESERTA
      // =======================================================================
      const jadwal = findJadwalEnrollmentStmt.get(numericJadwalId, req.user.id);
      if (!jadwal) {
        return res.status(403).json({
          code: "BUKAN_PESERTA",
          message: "Jadwal perkuliahan tidak ditemukan atau Anda tidak terdaftar pada mata kuliah ini.",
        });
      }

      // Ambil waktu server saat ini (Asia/Jakarta, UTC+07:00)
      const waktuSekarang = getWaktuSekarang();
      const hariIni = getHariIndonesia(waktuSekarang);
      const tanggalHariIni = getTanggalString(waktuSekarang);
      const jamMenitSekarang = getJamMenitString(waktuSekarang);
      const waktuISO = getWaktuISOString(waktuSekarang);
      const menitSekarang = parseJamKeMenit(jamMenitSekarang);
      const menitMulai = parseJamKeMenit(jadwal.jamMulai);
      const menitSelesai = parseJamKeMenit(jadwal.jamSelesai);

      // =======================================================================
      // VALIDASI 3: Hari ini bukan hari jadwal -> 409 BUKAN_HARI_KULIAH
      // =======================================================================
      if (hariIni.toLowerCase() !== jadwal.hari.toLowerCase()) {
        return res.status(409).json({
          code: "BUKAN_HARI_KULIAH",
          message: `Hari ini (${hariIni}) bukan hari perkuliahan untuk jadwal ini (${jadwal.hari}).`,
        });
      }

      // =======================================================================
      // VALIDASI 4: Di luar jendela waktu -> 409 DI_LUAR_WAKTU
      // (Sebelum jamMulai - 15 menit atau setelah jamSelesai)
      // =======================================================================
      const batasBukaMenit = menitMulai - PRESENSI_BUKA_SEBELUM_MENIT;
      if (menitSekarang < batasBukaMenit || menitSekarang > menitSelesai) {
        return res.status(409).json({
          code: "DI_LUAR_WAKTU",
          message: `Presensi hanya dapat dilakukan mulai 15 menit sebelum kuliah (${jadwal.jamMulai}) hingga jam selesai (${jadwal.jamSelesai}).`,
        });
      }

      // Validasi masa semester (Minggu 1 s/d 15)
      const mingguKe = hitungMingguKe(tanggalHariIni);
      if (mingguKe < 1 || mingguKe > 15) {
        return res.status(409).json({
          code: "DI_LUAR_SEMESTER",
          message: `Saat ini berada di luar masa perkuliahan semester (Minggu ke-${mingguKe}).`,
        });
      }

      // Ambil atau buat pertemuan hari ini
      const pertemuan = getOrCreatePertemuan(jadwal.jadwalId, mingguKe, tanggalHariIni);

      // =======================================================================
      // VALIDASI 5: Sesi presensi belum dibuka -> 409 SESI_DITUTUP
      // (Abaikan jika DEV_SESI_SELALU_BUKA aktif)
      // =======================================================================
      const sesiDibuka = Boolean(pertemuan.sesi_dibuka || DEV_SESI_SELALU_BUKA);
      if (!sesiDibuka) {
        return res.status(409).json({
          code: "SESI_DITUTUP",
          message: "Sesi presensi belum dibuka oleh dosen pengampu.",
        });
      }

      // =======================================================================
      // VALIDASI 6: accuracy lebih buruk dari MAX_AKURASI_METER -> 422 AKURASI_BURUK
      // =======================================================================
      const akurasiMeter = Math.round(numericAccuracy);
      if (akurasiMeter > MAX_AKURASI_METER) {
        return res.status(422).json({
          code: "AKURASI_BURUK",
          message: `Akurasi GPS perangkat Anda (±${akurasiMeter}m) melebihi batas maksimal (${MAX_AKURASI_METER}m). Silakan cari lokasi terbuka agar sinyal GPS lebih akurat.`,
          akurasiMeter,
          maxAkurasiMeter: MAX_AKURASI_METER,
        });
      }

      // =======================================================================
      // VALIDASI 7: Jarak > radius -> 403 DI_LUAR_AREA (Presensi TIDAK disimpan)
      // =======================================================================
      const jarakMeter = hitungJarakMeter(
        numericLat,
        numericLng,
        jadwal.lat,
        jadwal.lng
      );
      const radiusMeter = jadwal.radiusMeter;

      if (jarakMeter > radiusMeter) {
        return res.status(403).json({
          code: "DI_LUAR_AREA",
          message: `Anda berada di luar area presensi (${jarakMeter}m dari ${jadwal.lokasiNama}, radius maksimal ${radiusMeter}m).`,
          jarakMeter,
          radiusMeter,
          lokasiNama: jadwal.lokasiNama,
        });
      }

      // =======================================================================
      // VALIDASI 8: Sudah presensi di pertemuan ini -> 409 SUDAH_PRESENSI
      // (Kecuali DEV_IZINKAN_PRESENSI_ULANG aktif: timpa baris lama lewat UPSERT)
      // =======================================================================
      const existingPresensi = findPresensiByPertemuanAndMahasiswaStmt.get(
        pertemuan.id,
        req.user.id
      );

      if (existingPresensi && !DEV_IZINKAN_PRESENSI_ULANG) {
        return res.status(409).json({
          code: "SUDAH_PRESENSI",
          message: "Anda sudah melakukan presensi pada pertemuan kuliah ini.",
        });
      }

      // =======================================================================
      // VALIDASI 9: Wajib Daftar Wajah (jika WAJIB_DAFTAR_WAJAH aktif) -> 409 WAJAH_BELUM_DAFTAR
      // =======================================================================
      if (WAJIB_DAFTAR_WAJAH) {
        const countSample = countWajahSampleStmt.get(req.user.id);
        if (!countSample || countSample.total < JUMLAH_SAMPLE_WAJAH) {
          return res.status(409).json({
            code: "WAJAH_BELUM_DAFTAR",
            message: "Anda harus mendaftarkan sampel wajah terlebih dahulu sebelum melakukan presensi.",
          });
        }
      }

      // =======================================================================
      // VALIDASI 10: File Foto Presensi (harus ada & magic bytes valid) -> 400 FILE_TIDAK_VALID
      // =======================================================================
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({
          code: "FILE_TIDAK_VALID",
          message: "Foto presensi wajib disertakan.",
        });
      }

      const tipeFoto = deteksiTipeGambar(req.file.buffer);
      if (!tipeFoto) {
        return res.status(400).json({
          code: "FILE_TIDAK_VALID",
          message: "Format foto presensi tidak valid. Hanya menerima format JPEG atau PNG.",
        });
      }

      // =======================================================================
      // VALIDASI 11: Verifikasi Wajah via Face Service -> 403 WAJAH_TIDAK_COCOK
      // =======================================================================
      const sampleRows = findWajahSamplePathsStmt.all(req.user.id);
      const samplePaths = sampleRows.map((row) =>
        path.resolve(UPLOAD_DIR, row.file_path)
      );

      const hasilVerifikasi = await verifikasiWajah({
        fotoBuffer: req.file.buffer,
        samplePaths,
      });

      if (!hasilVerifikasi.cocok || hasilVerifikasi.skor < FACE_THRESHOLD) {
        return res.status(403).json({
          code: "WAJAH_TIDAK_COCOK",
          message: "Verifikasi wajah gagal. Wajah Anda tidak cocok dengan sampel terdaftar.",
          skor: hasilVerifikasi.skor,
        });
      }

      // =======================================================================
      // PENYIMPANAN FOTO KE DISK & DATABASE DALAM TRANSAKSI ATOMIK
      // (Foto hanya ditulis jika semua validasi lolos; jika DB gagal, file dihapus)
      // =======================================================================
      const statusHasil = hitungStatus(
        waktuSekarang,
        jadwal.jamMulai,
        TOLERANSI_TERLAMBAT_MENIT
      );

      const fotoHasil = simpanFotoPresensi(
        req.file.buffer,
        tipeFoto.ekstensi
      );
      const relPath = typeof fotoHasil === "string" ? fotoHasil : fotoHasil.relPath;
      const fullPath =
        typeof fotoHasil === "string"
          ? path.resolve(UPLOAD_DIR, fotoHasil)
          : fotoHasil.fullPath;

      let savedPresensiId = null;
      let fotoLamaUntukDihapus = null;
      if (existingPresensi && existingPresensi.foto_path) {
        fotoLamaUntukDihapus = path.resolve(UPLOAD_DIR, existingPresensi.foto_path);
      }

      db.exec("BEGIN");
      try {
        if (DEV_IZINKAN_PRESENSI_ULANG) {
          const info = upsertPresensiStmt.run(
            pertemuan.id,
            req.user.id,
            waktuISO,
            numericLat,
            numericLng,
            jarakMeter,
            statusHasil.status,
            hasilVerifikasi.metode || "face-recognition-simulasi",
            0,
            null,
            relPath,
            hasilVerifikasi.skor
          );
          savedPresensiId = info.lastInsertRowid || existingPresensi?.id;
        } else {
          const info = insertPresensiStmt.run(
            pertemuan.id,
            req.user.id,
            waktuISO,
            numericLat,
            numericLng,
            jarakMeter,
            statusHasil.status,
            hasilVerifikasi.metode || "face-recognition-simulasi",
            0,
            null,
            relPath,
            hasilVerifikasi.skor
          );
          savedPresensiId = info.lastInsertRowid;
        }

        db.exec("COMMIT");
      } catch (txError) {
        db.exec("ROLLBACK");
        // Hapus file baru dari disk jika transaksi DB gagal (mencegah file yatim)
        hapusFileAman(fullPath);

        if (
          txError.code === "SQLITE_CONSTRAINT" ||
          txError.code === "SQLITE_CONSTRAINT_UNIQUE" ||
          (txError.message && txError.message.includes("UNIQUE constraint failed"))
        ) {
          return res.status(409).json({
            code: "SUDAH_PRESENSI",
            message: "Anda sudah melakukan presensi pada pertemuan kuliah ini.",
          });
        }
        throw txError;
      }

      // Hapus foto lama jika presensi ulang berhasil dilakukan
      if (fotoLamaUntukDihapus) {
        hapusFileAman(fotoLamaUntukDihapus);
      }

      // Balas HTTP 201 dengan data presensi yang tersimpan
      return res.status(201).json({
        message: "Presensi berhasil dicatat",
        presensi: {
          id: savedPresensiId,
          pertemuanId: pertemuan.id,
          mahasiswaId: req.user.id,
          waktuPresensi: waktuISO,
          status: statusHasil.status,
          selisihMenit: statusHasil.selisihMenit,
          jarakMeter,
          lat: numericLat,
          lng: numericLng,
          metode: hasilVerifikasi.metode || "face-recognition-simulasi",
          skorWajah: hasilVerifikasi.skor,
          fotoUrl: `/api/presensi/${savedPresensiId}/foto`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/presensi/:id/foto
 * Mengirim file gambar presensi HANYA jika presensi itu milik pengguna yang login.
 * Jika bukan -> 404 (bukan 403, agar tidak membocorkan keberadaan data).
 * Header:
 *   Cache-Control: private, no-store
 *   X-Content-Type-Options: nosniff
 * TODO: Akses untuk dosen pengampu ditambahkan di Tahap 5.
 */
router.get("/:id/foto", authRequired, (req, res, next) => {
  try {
    const presensiId = Number(req.params.id);
    if (!Number.isInteger(presensiId) || presensiId <= 0) {
      return res.status(404).json({
        code: "FOTO_TIDAK_DITEMUKAN",
        message: "Foto presensi tidak ditemukan.",
      });
    }

    const row = findPresensiByIdStmt.get(presensiId);
    // Tolak jika data tidak ditemukan atau bukan milik mahasiswa yang login -> 404
    if (!row || row.mahasiswa_id !== req.user.id || !row.foto_path) {
      return res.status(404).json({
        code: "FOTO_TIDAK_DITEMUKAN",
        message: "Foto presensi tidak ditemukan.",
      });
    }

    const fullPath = path.resolve(UPLOAD_DIR, row.foto_path);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        code: "FOTO_TIDAK_DITEMUKAN",
        message: "File foto tidak ditemukan di server.",
      });
    }

    const ext = path.extname(fullPath).toLowerCase();
    const mimeType = ext === ".png" ? "image/png" : "image/jpeg";

    res.set("Cache-Control", "private, no-store");
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Content-Type", mimeType);

    return fs.createReadStream(fullPath).pipe(res);
  } catch (error) {
    next(error);
  }
});

export default router;
