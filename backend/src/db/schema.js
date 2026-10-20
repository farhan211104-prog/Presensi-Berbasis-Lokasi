import db from "./connection.js";

// Fungsi untuk membuat semua tabel dan indeks SQLite saat server start
export function initSchema() {
  const schemaSQL = `
    -- 1. Tabel Users
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('mahasiswa', 'dosen')),
      nama TEXT NOT NULL,
      nim_nip TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Tabel Mata Kuliah
    CREATE TABLE IF NOT EXISTS mata_kuliah (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kode TEXT UNIQUE NOT NULL,
      nama TEXT NOT NULL,
      sks INTEGER NOT NULL,
      dosen_id INTEGER,
      FOREIGN KEY (dosen_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- 3. Tabel Jadwal Kuliah
    CREATE TABLE IF NOT EXISTS jadwal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mata_kuliah_id INTEGER NOT NULL,
      hari TEXT NOT NULL,
      jam_mulai TEXT NOT NULL,
      jam_selesai TEXT NOT NULL,
      ruangan TEXT,
      lokasi_nama TEXT,
      lat REAL,
      lng REAL,
      radius_meter INTEGER,
      FOREIGN KEY (mata_kuliah_id) REFERENCES mata_kuliah(id) ON DELETE CASCADE
    );

    -- 4. Tabel Enrollment (Mahasiswa mengambil Mata Kuliah)
    CREATE TABLE IF NOT EXISTS enrollment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mahasiswa_id INTEGER NOT NULL,
      mata_kuliah_id INTEGER NOT NULL,
      UNIQUE(mahasiswa_id, mata_kuliah_id),
      FOREIGN KEY (mahasiswa_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (mata_kuliah_id) REFERENCES mata_kuliah(id) ON DELETE CASCADE
    );

    -- 5. Tabel Pertemuan Kuliah (Minggu 1 s/d 15)
    CREATE TABLE IF NOT EXISTS pertemuan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jadwal_id INTEGER NOT NULL,
      minggu_ke INTEGER NOT NULL,
      tanggal TEXT,
      sesi_dibuka INTEGER DEFAULT 0,
      catatan TEXT,
      UNIQUE(jadwal_id, minggu_ke),
      FOREIGN KEY (jadwal_id) REFERENCES jadwal(id) ON DELETE CASCADE
    );

    -- 6. Tabel Presensi Kehadiran
    CREATE TABLE IF NOT EXISTS presensi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pertemuan_id INTEGER NOT NULL,
      mahasiswa_id INTEGER NOT NULL,
      waktu_presensi DATETIME,
      lat REAL,
      lng REAL,
      jarak_meter REAL,
      status TEXT CHECK(status IN ('hadir', 'terlambat', 'izin', 'sakit', 'alpha')),
      metode TEXT,
      diubah_dosen INTEGER DEFAULT 0,
      catatan TEXT,
      foto_path TEXT,
      UNIQUE(pertemuan_id, mahasiswa_id),
      FOREIGN KEY (pertemuan_id) REFERENCES pertemuan(id) ON DELETE CASCADE,
      FOREIGN KEY (mahasiswa_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 7. Tabel Nilai Mahasiswa
    CREATE TABLE IF NOT EXISTS nilai (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mahasiswa_id INTEGER NOT NULL,
      mata_kuliah_id INTEGER NOT NULL,
      semester TEXT NOT NULL,
      tugas REAL,
      uts REAL,
      uas REAL,
      UNIQUE(mahasiswa_id, mata_kuliah_id, semester),
      FOREIGN KEY (mahasiswa_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (mata_kuliah_id) REFERENCES mata_kuliah(id) ON DELETE CASCADE
    );

    -- 8. Tabel Wajah Sample Biometrik (Tahap 4)
    CREATE TABLE IF NOT EXISTS wajah_sample (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mahasiswa_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      urutan INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mahasiswa_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 9. Tabel Persetujuan Biometrik Wajah
    CREATE TABLE IF NOT EXISTS persetujuan_biometrik (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mahasiswa_id INTEGER UNIQUE NOT NULL,
      disetujui_pada DATETIME DEFAULT CURRENT_TIMESTAMP,
      versi_teks TEXT NOT NULL,
      FOREIGN KEY (mahasiswa_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Indeks untuk mengoptimalkan performa query foreign key
    CREATE INDEX IF NOT EXISTS idx_mata_kuliah_dosen_id ON mata_kuliah(dosen_id);
    CREATE INDEX IF NOT EXISTS idx_jadwal_mata_kuliah_id ON jadwal(mata_kuliah_id);
    CREATE INDEX IF NOT EXISTS idx_enrollment_mahasiswa_id ON enrollment(mahasiswa_id);
    CREATE INDEX IF NOT EXISTS idx_enrollment_mata_kuliah_id ON enrollment(mata_kuliah_id);
    CREATE INDEX IF NOT EXISTS idx_pertemuan_jadwal_id ON pertemuan(jadwal_id);
    CREATE INDEX IF NOT EXISTS idx_presensi_pertemuan_id ON presensi(pertemuan_id);
    CREATE INDEX IF NOT EXISTS idx_presensi_mahasiswa_id ON presensi(mahasiswa_id);
    CREATE INDEX IF NOT EXISTS idx_nilai_mahasiswa_id ON nilai(mahasiswa_id);
    CREATE INDEX IF NOT EXISTS idx_nilai_mata_kuliah_id ON nilai(mata_kuliah_id);
    CREATE INDEX IF NOT EXISTS idx_wajah_sample_mahasiswa ON wajah_sample(mahasiswa_id);

    -- Bersihkan duplikasi nilai lama jika ada sebelum menerapkan indeks unik
    DELETE FROM nilai WHERE id NOT IN (
      SELECT MIN(id) FROM nilai GROUP BY mahasiswa_id, mata_kuliah_id, semester
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_nilai_unik ON nilai(mahasiswa_id, mata_kuliah_id, semester);
  `;

  db.exec(schemaSQL);

  // Migrasi aman: Tambahkan kolom skor_wajah pada tabel presensi jika belum ada
  const presensiCols = db.pragma("table_info(presensi)");
  const hasSkorWajah = presensiCols.some((c) => c.name === "skor_wajah");
  if (!hasSkorWajah) {
    db.exec("ALTER TABLE presensi ADD COLUMN skor_wajah REAL;");
  }
}

export default initSchema;
