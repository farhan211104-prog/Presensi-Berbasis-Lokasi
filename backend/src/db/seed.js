import bcrypt from "bcryptjs";
import db from "./connection.js";
import { initSchema } from "./schema.js";

import fs from "fs";
import { UPLOAD_DIR } from "../config/env.js";
import { initUploadDirs } from "../utils/upload.js";

// Fungsi utama proses seeding database SQLite
export async function seedDatabase(options = { reset: false }) {
  console.log("Memulai proses seeding database...");

  // 1. Pastikan skema tabel sudah dibuat dan folder uploads siap
  initSchema();
  initUploadDirs();

  const isReset = options.reset || process.argv.includes("--reset");

  if (isReset) {
    console.log("Opsi --reset aktif: Membersihkan seluruh tabel lama & folder uploads...");
    db.exec(`
      DELETE FROM wajah_sample;
      DELETE FROM persetujuan_biometrik;
      DELETE FROM presensi;
      DELETE FROM nilai;
      DELETE FROM pertemuan;
      DELETE FROM enrollment;
      DELETE FROM jadwal;
      DELETE FROM mata_kuliah;
      DELETE FROM users;
      DELETE FROM sqlite_sequence WHERE name IN ('wajah_sample', 'persetujuan_biometrik', 'presensi', 'nilai', 'pertemuan', 'enrollment', 'jadwal', 'mata_kuliah', 'users');
    `);

    // Bersihkan file di folder uploads
    try {
      if (fs.existsSync(UPLOAD_DIR)) {
        fs.rmSync(UPLOAD_DIR, { recursive: true, force: true });
        initUploadDirs();
      }
    } catch (e) {
      // Abaikan jika tidak ada file
    }
  }

  // Siapkan hash password (cost 10)
  const passwordMahasiswaHash = await bcrypt.hash("mahasiswa123", 10);
  const passwordDosenHash = await bcrypt.hash("dosen123", 10);

  // --------------------------------------------------------------------------
  // 1. SEED USERS (Dosen & Mahasiswa)
  // --------------------------------------------------------------------------
  const insertUserStmt = db.prepare(`
    INSERT OR IGNORE INTO users (username, password_hash, role, nama, nim_nip)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Dosen utama BRP
  insertUserStmt.run(
    "BRP",
    passwordDosenHash,
    "dosen",
    "Dr. Bayu Rima Pratama, S.T., M.T.",
    "14880021"
  );

  // Dosen kedua ARF (pengampu Pemrograman Web)
  insertUserStmt.run(
    "ARF",
    passwordDosenHash,
    "dosen",
    "Ade Romadhony, S.T., M.T.",
    "14880022"
  );

  // Dosen ketiga PHG (pengampu Machine Learning)
  insertUserStmt.run(
    "PHG",
    passwordDosenHash,
    "dosen",
    "Dr. Putu Harry Gunawan",
    "14880023"
  );

  // Mahasiswa utama (Ahmad Farhan Fitrian)
  insertUserStmt.run(
    "101012300373",
    passwordMahasiswaHash,
    "mahasiswa",
    "Ahmad Farhan Fitrian",
    "101012300373"
  );

  // Daftar mahasiswa dummy dari data dosen
  const dummyStudents = [
    { nim: "101012300102", nama: "Alifia Nurul Hidayah" },
    { nim: "101012300145", nama: "Budi Santoso" },
    { nim: "101012300188", nama: "Citra Dewi Lestari" },
    { nim: "101012300215", nama: "Daffa Raditya Pratama" },
    { nim: "101012300249", nama: "Elsa Safira" },
    { nim: "101012300288", nama: "Gita Permata Sari" },
    { nim: "101012300312", nama: "Hafizh Rabbani" },
    { nim: "101012300356", nama: "Intan Kusuma Wardani" },
    { nim: "101012300399", nama: "Joko Wibowo" },
    { nim: "101012300430", nama: "Kevin Jonathan" },
    { nim: "101012300477", nama: "Lina Marlina" },
    { nim: "101012300511", nama: "Mochammad Rizky" },
    { nim: "101012300542", nama: "Nabila Putri Maharani" },
    { nim: "101012300588", nama: "Oscar Pratama" },
    { nim: "101012300601", nama: "Pandu Wijaya" },
    { nim: "101012300635", nama: "Qonita Zahra" },
    { nim: "101012300672", nama: "Reza Mahendra" },
    { nim: "101012300705", nama: "Siti Rahmawati" },
    { nim: "101012300744", nama: "Tegar Nugroho" },
  ];

  for (const s of dummyStudents) {
    insertUserStmt.run(s.nim, passwordMahasiswaHash, "mahasiswa", s.nama, s.nim);
  }

  // Ambil ID user dosen
  const getUserStmt = db.prepare("SELECT id FROM users WHERE username = ?");
  const dosenBRP = getUserStmt.get("BRP");
  const dosenARF = getUserStmt.get("ARF");
  const dosenPHG = getUserStmt.get("PHG");
  const mhsFarhan = getUserStmt.get("101012300373");

  // --------------------------------------------------------------------------
  // 2. SEED MATA KULIAH
  // --------------------------------------------------------------------------
  const insertMatkulStmt = db.prepare(`
    INSERT OR IGNORE INTO mata_kuliah (kode, nama, sks, dosen_id)
    VALUES (?, ?, ?, ?)
  `);

  insertMatkulStmt.run("AZK4BAA2", "PROPOSAL TUGAS AKHIR", 2, dosenBRP?.id);
  insertMatkulStmt.run("CSG3H3", "PEMROGRAMAN WEB", 3, dosenARF?.id);
  insertMatkulStmt.run("CSG4C3", "MACHINE LEARNING", 3, dosenBRP?.id);
  insertMatkulStmt.run("CSG3J3", "KECERDASAN BUATAN LANJUT", 3, dosenBRP?.id);
  insertMatkulStmt.run("CSG4D3", "Keamanan Informasi", 3, dosenBRP?.id);
  insertMatkulStmt.run("CSG4E3", "Cloud Computing", 3, dosenBRP?.id);
  insertMatkulStmt.run("CSG4F2", "Kapita Selekta Informatika", 2, dosenBRP?.id);
  insertMatkulStmt.run("CSG3A3", "Rekayasa Perangkat Lunak", 3, dosenARF?.id);
  insertMatkulStmt.run("CSG3B3", "Sistem Basis Data Lanjut", 3, dosenARF?.id);
  insertMatkulStmt.run("CSG3C3", "Jaringan Komputer", 3, dosenPHG?.id);
  insertMatkulStmt.run("CSG3D2", "Etika Profesi", 2, dosenBRP?.id);
  insertMatkulStmt.run("CSG3E3", "Analisis Kompleksitas Algoritma", 3, dosenPHG?.id);
  insertMatkulStmt.run("CSG3F3", "Kecerdasan Buatan", 3, dosenBRP?.id);

  const getMatkulStmt = db.prepare("SELECT id, kode FROM mata_kuliah");
  const allMatkul = getMatkulStmt.all();
  const matkulMap = {};
  for (const m of allMatkul) {
    matkulMap[m.kode] = m.id;
  }

  // --------------------------------------------------------------------------
  // 3. SEED JADWAL (Koordinat AZK4BAA2 wajib persis dari lokasi.js)
  // --------------------------------------------------------------------------
  const insertJadwalStmt = db.prepare(`
    INSERT OR IGNORE INTO jadwal (mata_kuliah_id, hari, jam_mulai, jam_selesai, ruangan, lokasi_nama, lat, lng, radius_meter)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const checkJadwalExist = db.prepare(
    "SELECT id FROM jadwal WHERE mata_kuliah_id = ?"
  );

  // Jadwal AZK4BAA2 (Proposal TA)
  if (matkulMap["AZK4BAA2"] && !checkJadwalExist.get(matkulMap["AZK4BAA2"])) {
    insertJadwalStmt.run(
      matkulMap["AZK4BAA2"],
      "Senin",
      "14:30",
      "16:30",
      "KU3.08.06",
      "Titik Acuan Presensi Telkom University",
      -6.9856,
      107.6331,
      30
    );
  }

  // Jadwal CSG3H3 (Pemrograman Web)
  if (matkulMap["CSG3H3"] && !checkJadwalExist.get(matkulMap["CSG3H3"])) {
    insertJadwalStmt.run(
      matkulMap["CSG3H3"],
      "Senin",
      "08:30",
      "10:30",
      "IF-02-04",
      "Titik Acuan Presensi Telkom University",
      -6.9856,
      107.6331,
      30
    );
  }

  // Jadwal CSG4C3 (Machine Learning)
  if (matkulMap["CSG4C3"] && !checkJadwalExist.get(matkulMap["CSG4C3"])) {
    insertJadwalStmt.run(
      matkulMap["CSG4C3"],
      "Selasa",
      "09:30",
      "12:30",
      "IF-03-01",
      "Titik Acuan Presensi Telkom University",
      -6.9856,
      107.6331,
      30
    );
  }

  // Jadwal CSG3J3 (Kecerdasan Buatan Lanjut)
  if (matkulMap["CSG3J3"] && !checkJadwalExist.get(matkulMap["CSG3J3"])) {
    insertJadwalStmt.run(
      matkulMap["CSG3J3"],
      "Kamis",
      "13:30",
      "16:30",
      "TULT-08-02",
      "Titik Acuan Presensi Telkom University",
      -6.9856,
      107.6331,
      30
    );
  }

  // --------------------------------------------------------------------------
  // 4. SEED ENROLLMENT (Pengambilan Mata Kuliah)
  // --------------------------------------------------------------------------
  const insertEnrollmentStmt = db.prepare(`
    INSERT OR IGNORE INTO enrollment (mahasiswa_id, mata_kuliah_id)
    VALUES (?, ?)
  `);

  // Farhan mengambil semua mata kuliah semester aktif & riwayat
  for (const kode of Object.keys(matkulMap)) {
    if (mhsFarhan?.id && matkulMap[kode]) {
      insertEnrollmentStmt.run(mhsFarhan.id, matkulMap[kode]);
    }
  }

  // Kelas AZK4BAA2 (12 mahasiswa)
  const azkStudents = [
    "101012300102", "101012300145", "101012300188", "101012300215",
    "101012300249", "101012300288", "101012300312", "101012300356",
    "101012300399", "101012300430", "101012300477",
  ];
  for (const nim of azkStudents) {
    const u = getUserStmt.get(nim);
    if (u?.id && matkulMap["AZK4BAA2"]) {
      insertEnrollmentStmt.run(u.id, matkulMap["AZK4BAA2"]);
    }
  }

  // Kelas CSG4C3
  const csg4c3Students = [
    "101012300102", "101012300145", "101012300215", "101012300288",
    "101012300356", "101012300399", "101012300430", "101012300511",
    "101012300542", "101012300588",
  ];
  for (const nim of csg4c3Students) {
    const u = getUserStmt.get(nim);
    if (u?.id && matkulMap["CSG4C3"]) {
      insertEnrollmentStmt.run(u.id, matkulMap["CSG4C3"]);
    }
  }

  // Kelas CSG3J3
  const csg3j3Students = [
    "101012300188", "101012300249", "101012300312", "101012300477",
    "101012300511", "101012300542", "101012300601", "101012300635",
    "101012300672", "101012300705", "101012300744",
  ];
  for (const nim of csg3j3Students) {
    const u = getUserStmt.get(nim);
    if (u?.id && matkulMap["CSG3J3"]) {
      insertEnrollmentStmt.run(u.id, matkulMap["CSG3J3"]);
    }
  }

  // --------------------------------------------------------------------------
  // 5. SEED PERTEMUAN (Minggu 1 s/d 15)
  // --------------------------------------------------------------------------
  const insertPertemuanStmt = db.prepare(`
    INSERT OR IGNORE INTO pertemuan (jadwal_id, minggu_ke, tanggal, sesi_dibuka, catatan)
    VALUES (?, ?, ?, ?, ?)
  `);

  const materiAZK = {
    1: "Kontrak Perkuliahan & Penjelasan Alur Tugas Akhir",
    2: "Identifikasi Masalah & Perumusan Topik Riset",
    3: "Studi Literatur & Systematic Literature Review",
    4: "Penyusunan Bab 1 Pendahuluan & Hipotesis",
    5: "Metodologi Penelitian & Desain Sistem",
    6: "Evaluasi Draft Bab 1 dan Bab 2",
    7: "Penyusunan Bab 3 Metodologi & Rencana Pengujian",
    8: "Review Progress Bab 1-3 & Persiapan Seminar Proposal",
    9: "Simulasi Presentasi Seminar Proposal",
    10: "Perbaikan Proposal Pasca Seminar",
    11: "Penyusunan Instrumen Pengumpulan Data",
    12: "Implementasi Prototipe Sistem Tahap 1",
    13: "Implementasi Prototipe Sistem Tahap 2",
    14: "Pengujian Fungsionalitas & Akurasi Model",
    15: "Finalisasi Draft Laporan Tugas Akhir",
  };

  const tanggalAZK = {
    1: "25 Agu 2026",
    2: "01 Sep 2026",
    3: "08 Sep 2026",
    4: "15 Sep 2026",
    5: "22 Sep 2026",
    6: "29 Sep 2026",
    7: "06 Okt 2026",
    8: "12 Okt 2026",
    9: "19 Okt 2026",
    10: "26 Okt 2026",
    11: "02 Nov 2026",
    12: "09 Nov 2026",
    13: "16 Nov 2026",
    14: "23 Nov 2026",
    15: "30 Nov 2026",
  };

  const getJadwalByMatkul = db.prepare(
    "SELECT id FROM jadwal WHERE mata_kuliah_id = ?"
  );
  const jadwalAZK = getJadwalByMatkul.get(matkulMap["AZK4BAA2"]);
  const jadwalCSG3H3 = getJadwalByMatkul.get(matkulMap["CSG3H3"]);
  const jadwalCSG4C3 = getJadwalByMatkul.get(matkulMap["CSG4C3"]);
  const jadwalCSG3J3 = getJadwalByMatkul.get(matkulMap["CSG3J3"]);

  const allJadwalList = [
    { j: jadwalAZK, materi: materiAZK },
    { j: jadwalCSG3H3, materi: materiAZK },
    { j: jadwalCSG4C3, materi: materiAZK },
    { j: jadwalCSG3J3, materi: materiAZK },
  ];

  for (const item of allJadwalList) {
    if (item.j?.id) {
      for (let m = 1; m <= 15; m++) {
        // Pertemuan ke-8 dibuka secara default
        const sesiBuka = m === 8 ? 1 : 0;
        insertPertemuanStmt.run(
          item.j.id,
          m,
          tanggalAZK[m] || `Pertemuan ${m}`,
          sesiBuka,
          item.materi[m] || `Topik Perkuliahan Minggu ${m}`
        );
      }
    }
  }

  // --------------------------------------------------------------------------
  // 6. SEED PRESENSI MINGGU 1 s/d 7 (Riwayat Presensi Dummy)
  // --------------------------------------------------------------------------
  const insertPresensiStmt = db.prepare(`
    INSERT OR IGNORE INTO presensi (
      pertemuan_id, mahasiswa_id, waktu_presensi, lat, lng, jarak_meter,
      status, metode, diubah_dosen, catatan, foto_path
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const getPertemuanByJadwalAndMinggu = db.prepare(
    "SELECT id FROM pertemuan WHERE jadwal_id = ? AND minggu_ke = ?"
  );

  // Presensi Farhan di AZK4BAA2 (Minggu 1-7)
  const farhanStatusesAZK = [
    "hadir", "hadir", "izin", "hadir", "hadir", "sakit", "hadir"
  ];
  if (jadwalAZK?.id && mhsFarhan?.id) {
    for (let m = 1; m <= 7; m++) {
      const p = getPertemuanByJadwalAndMinggu.get(jadwalAZK.id, m);
      if (p?.id) {
        insertPresensiStmt.run(
          p.id,
          mhsFarhan.id,
          "2026-09-01 14:35:00",
          -6.9856,
          107.6331,
          10.5,
          farhanStatusesAZK[m - 1],
          "face-recognition",
          0,
          null,
          null
        );
      }
    }
  }

  // Presensi mahasiswa dummy di AZK4BAA2 minggu 1-7
  const dummyPatterns = {
    "101012300102": ["hadir", "hadir", "hadir", "terlambat", "hadir", "hadir", "hadir"],
    "101012300145": ["hadir", "terlambat", "hadir", "hadir", "izin", "terlambat", "hadir"],
    "101012300188": ["hadir", "hadir", "hadir", "hadir", "hadir", "hadir", "hadir"],
    "101012300215": ["alpha", "hadir", "alpha", "hadir", "alpha", "sakit", "hadir"],
    "101012300249": ["hadir", "hadir", "izin", "hadir", "hadir", "hadir", "hadir"],
    "101012300288": ["hadir", "sakit", "hadir", "hadir", "terlambat", "hadir", "hadir"],
    "101012300312": ["alpha", "alpha", "hadir", "alpha", "hadir", "alpha", "hadir"],
    "101012300356": ["hadir", "hadir", "hadir", "hadir", "hadir", "izin", "hadir"],
    "101012300399": ["terlambat", "hadir", "terlambat", "hadir", "hadir", "terlambat", "hadir"],
    "101012300430": ["hadir", "hadir", "alpha", "hadir", "hadir", "hadir", "hadir"],
    "101012300477": ["hadir", "hadir", "hadir", "sakit", "hadir", "hadir", "hadir"],
  };

  if (jadwalAZK?.id) {
    for (const [nim, pattern] of Object.entries(dummyPatterns)) {
      const u = getUserStmt.get(nim);
      if (u?.id) {
        for (let m = 1; m <= 7; m++) {
          const p = getPertemuanByJadwalAndMinggu.get(jadwalAZK.id, m);
          if (p?.id) {
            insertPresensiStmt.run(
              p.id,
              u.id,
              "2026-09-01 14:32:00",
              -6.9856,
              107.6331,
              12,
              pattern[m - 1],
              "face-recognition-simulasi",
              0,
              null,
              null
            );
          }
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // 7. SEED NILAI (Semester 6 & 5)
  // --------------------------------------------------------------------------
  const insertNilaiStmt = db.prepare(`
    INSERT OR IGNORE INTO nilai (mahasiswa_id, mata_kuliah_id, semester, tugas, uts, uas)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  if (mhsFarhan?.id) {
    const nilaiSem6 = [
      { kode: "AZK4BAA2", tugas: 86, uts: 84, uas: 88 },
      { kode: "CSG3H3", tugas: 92, uts: 90, uas: 94 },
      { kode: "CSG4C3", tugas: 78, uts: 74, uas: 80 },
      { kode: "CSG4D3", tugas: 84, uts: 80, uas: 85 },
      { kode: "CSG4E3", tugas: 88, uts: 85, uas: 87 },
      { kode: "CSG4F2", tugas: 85, uts: 80, uas: 85 },
    ];

    for (const n of nilaiSem6) {
      if (matkulMap[n.kode]) {
        insertNilaiStmt.run(
          mhsFarhan.id,
          matkulMap[n.kode],
          "Semester 6 (Genap 2025/2026)",
          n.tugas,
          n.uts,
          n.uas
        );
      }
    }

    const nilaiSem5 = [
      { kode: "CSG3A3", tugas: 85, uts: 82, uas: 88 },
      { kode: "CSG3B3", tugas: 74, uts: 72, uas: 75 },
      { kode: "CSG3C3", tugas: 68, uts: 65, uas: 70 },
      { kode: "CSG3D2", tugas: 90, uts: 88, uas: 92 },
      { kode: "CSG3E3", tugas: 82, uts: 80, uas: 84 },
      { kode: "CSG3F3", tugas: 88, uts: 85, uas: 86 },
    ];

    for (const n of nilaiSem5) {
      if (matkulMap[n.kode]) {
        insertNilaiStmt.run(
          mhsFarhan.id,
          matkulMap[n.kode],
          "Semester 5 (Ganjil 2025/2026)",
          n.tugas,
          n.uts,
          n.uas
        );
      }
    }
  }

  console.log("Seeding database SQLite berhasil diselesaikan!");
}

// Jalankan langsung jika script ini dieksekusi via CLI
if (process.argv[1]?.endsWith("seed.js")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Gagal menjalankan seeding:", err);
      process.exit(1);
    });
}
