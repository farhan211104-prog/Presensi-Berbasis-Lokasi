// ============================================================================
// DATA DUMMY PORTAL MAHASISWA TEL-U
// Semua data di sini adalah data tiruan untuk keperluan simulasi (tanpa backend)
// ============================================================================

// Data Akun Dummy untuk Mahasiswa & Dosen
export const DUMMY_ACCOUNTS = {
  mahasiswa: {
    username: "101012300373",
    password: "mahasiswa123",
    role: "mahasiswa",
    nama: "Ahmad Farhan Fitrian",
    nim: "101012300373",
    prodi: "S1 Informatika",
    fakultas: "Fakultas Informatika",
    angkatan: "2023",
    status: "Aktif",
    email: "farhan@student.telkomuniversity.ac.id",
    dosenWali: "Dr. Bayu Rima Pratama, S.T., M.T.",
  },
  dosen: {
    username: "BRP",
    password: "dosen123",
    role: "dosen",
    nama: "Dr. Bayu Rima Pratama, S.T., M.T.",
    kodeDosen: "BRP",
    nip: "14880021",
    email: "bayurima@telkomuniversity.ac.id",
  },
};

// Data Jadwal Kuliah HARI INI
export const JADWAL_HARI_INI = [
  {
    id: "AZK4BAA2",
    kode: "AZK4BAA2",
    nama: "PROPOSAL TUGAS AKHIR",
    waktu: "14:30 - 16:30",
    ruangan: "KU3.08.06",
    kodeDosen: "BRP",
    namaDosen: "Dr. Bayu Rima Pratama, S.T., M.T.",
    sks: 2,
    pertemuanKe: 8,
  },
  {
    id: "CSG3H3",
    kode: "CSG3H3",
    nama: "PEMROGRAMAN WEB",
    waktu: "08:30 - 10:30",
    ruangan: "IF-02-04",
    kodeDosen: "ARF",
    namaDosen: "Ade Romadhony, S.T., M.T.",
    sks: 3,
    pertemuanKe: 8,
  },
];

// Konversi Indeks Nilai ke Bobot Angka (Standar Telkom University)
export const NILAI_BOBOT = {
  A: 4.0,
  AB: 3.5,
  B: 3.0,
  BC: 2.5,
  C: 2.0,
  D: 1.0,
  E: 0.0,
};

// Data Nilai Mahasiswa per Semester
export const DATA_SEMESTER = [
  {
    id: "sem-6",
    nama: "Semester 6 (Genap 2025/2026)",
    mataKuliah: [
      {
        kode: "AZK4BAA2",
        nama: "Proposal Tugas Akhir",
        sks: 2,
        tugas: 86,
        uts: 84,
        uas: 88,
        nilaiAkhir: 86.2,
        indeks: "A",
      },
      {
        kode: "CSG3H3",
        nama: "Pemrograman Web",
        sks: 3,
        tugas: 92,
        uts: 90,
        uas: 94,
        nilaiAkhir: 92.2,
        indeks: "A",
      },
      {
        kode: "CSG4C3",
        nama: "Machine Learning",
        sks: 3,
        tugas: 78,
        uts: 74,
        uas: 80,
        nilaiAkhir: 77.6,
        indeks: "B",
      },
      {
        kode: "CSG4D3",
        nama: "Keamanan Informasi",
        sks: 3,
        tugas: 84,
        uts: 80,
        uas: 85,
        nilaiAkhir: 83.2,
        indeks: "AB",
      },
      {
        kode: "CSG4E3",
        nama: "Cloud Computing",
        sks: 3,
        tugas: 88,
        uts: 85,
        uas: 87,
        nilaiAkhir: 86.8,
        indeks: "A",
      },
      {
        kode: "CSG4F2",
        nama: "Kapita Selekta Informatika",
        sks: 2,
        tugas: 85,
        uts: 80,
        uas: 85,
        nilaiAkhir: 83.5,
        indeks: "AB",
      },
    ],
  },
  {
    id: "sem-5",
    nama: "Semester 5 (Ganjil 2025/2026)",
    mataKuliah: [
      {
        kode: "CSG3A3",
        nama: "Rekayasa Perangkat Lunak",
        sks: 3,
        tugas: 85,
        uts: 82,
        uas: 88,
        nilaiAkhir: 85.5,
        indeks: "A",
      },
      {
        kode: "CSG3B3",
        nama: "Sistem Basis Data Lanjut",
        sks: 3,
        tugas: 80,
        uts: 78,
        uas: 82,
        nilaiAkhir: 80.2,
        indeks: "AB",
      },
      {
        kode: "CSG3C3",
        nama: "Jaringan Komputer",
        sks: 3,
        tugas: 75,
        uts: 72,
        uas: 78,
        nilaiAkhir: 75.4,
        indeks: "B",
      },
      {
        kode: "CSG3D2",
        nama: "Etika Profesi",
        sks: 2,
        tugas: 90,
        uts: 88,
        uas: 92,
        nilaiAkhir: 90.2,
        indeks: "A",
      },
      {
        kode: "CSG3E3",
        nama: "Analisis Kompleksitas Algoritma",
        sks: 3,
        tugas: 82,
        uts: 80,
        uas: 84,
        nilaiAkhir: 82.3,
        indeks: "A",
      },
      {
        kode: "CSG3F3",
        nama: "Kecerdasan Buatan",
        sks: 3,
        tugas: 88,
        uts: 85,
        uas: 86,
        nilaiAkhir: 86.4,
        indeks: "A",
      },
    ],
  },
];

// Helper fungsi untuk menghitung IPS (Indeks Prestasi Semester)
export function hitungIPS(mataKuliahList) {
  let totalBobotSks = 0;
  let totalSks = 0;

  mataKuliahList.forEach((mk) => {
    const bobot = NILAI_BOBOT[mk.indeks] ?? 0;
    totalBobotSks += bobot * mk.sks;
    totalSks += mk.sks;
  });

  return totalSks > 0 ? (totalBobotSks / totalSks).toFixed(2) : "0.00";
}

// Helper fungsi untuk menghitung IPK (Indeks Prestasi Kumulatif)
export function hitungIPK(semuaSemester) {
  let totalBobotSksSemua = 0;
  let totalSksSemua = 0;

  semuaSemester.forEach((sem) => {
    sem.mataKuliah.forEach((mk) => {
      const bobot = NILAI_BOBOT[mk.indeks] ?? 0;
      totalBobotSksSemua += bobot * mk.sks;
      totalSksSemua += mk.sks;
    });
  });

  return totalSksSemua > 0
    ? (totalBobotSksSemua / totalSksSemua).toFixed(2)
    : "0.00";
}

// Data Dummy Riwayat Pertemuan Presensi (Awal semester s.d. pertemuan ke-8 hari ini)
// Pertemuan ke-8 adalah hari ini (12 Oktober 2026), status awalnya "Belum Presensi"
// yang akan otomatis sinkron dengan tombol di Halaman Presensi!
export const INITIAL_REKAP_KEHADIRAN = [
  {
    courseId: "AZK4BAA2",
    kode: "AZK4BAA2",
    nama: "PROPOSAL TUGAS AKHIR",
    dosen: "Dr. Bayu Rima Pratama, S.T., M.T. (BRP)",
    pertemuanList: [
      {
        pertemuan: 1,
        tanggal: "25 Agu 2026",
        materi: "Kontrak Perkuliahan & Penjelasan Alur Tugas Akhir",
        status: "Hadir",
      },
      {
        pertemuan: 2,
        tanggal: "01 Sep 2026",
        materi: "Identifikasi Masalah & Perumusan Topik Riset",
        status: "Hadir",
      },
      {
        pertemuan: 3,
        tanggal: "08 Sep 2026",
        materi: "Studi Literatur & Systematic Literature Review",
        status: "Izin",
      },
      {
        pertemuan: 4,
        tanggal: "15 Sep 2026",
        materi: "Penyusunan Bab 1 Pendahuluan & Hipotesis",
        status: "Hadir",
      },
      {
        pertemuan: 5,
        tanggal: "22 Sep 2026",
        materi: "Metodologi Penelitian & Desain Sistem",
        status: "Hadir",
      },
      {
        pertemuan: 6,
        tanggal: "29 Sep 2026",
        materi: "Evaluasi Draft Bab 1 dan Bab 2",
        status: "Sakit",
      },
      {
        pertemuan: 7,
        tanggal: "06 Okt 2026",
        materi: "Penyusunan Bab 3 Metodologi & Rencana Pengujian",
        status: "Hadir",
      },
      {
        pertemuan: 8,
        tanggal: "12 Okt 2026 (Hari Ini)",
        materi: "Review Progress Bab 1-3 & Persiapan Seminar Proposal",
        status: "Belum Presensi", // akan berubah jadi "Hadir" begitu presensi diklik
        isToday: true,
      },
    ],
  },
  {
    courseId: "CSG3H3",
    kode: "CSG3H3",
    nama: "PEMROGRAMAN WEB",
    dosen: "Ade Romadhony, S.T., M.T. (ARF)",
    pertemuanList: [
      {
        pertemuan: 1,
        tanggal: "24 Agu 2026",
        materi: "Pengenalan Arsitektur Web Modern & HTML5",
        status: "Hadir",
      },
      {
        pertemuan: 2,
        tanggal: "31 Agu 2026",
        materi: "CSS Modern, Flexbox, dan CSS Grid",
        status: "Hadir",
      },
      {
        pertemuan: 3,
        tanggal: "07 Sep 2026",
        materi: "JavaScript ES6+ & DOM Manipulation",
        status: "Hadir",
      },
      {
        pertemuan: 4,
        tanggal: "14 Sep 2026",
        materi: "Dasar React.js & Komponen JSX",
        status: "Hadir",
      },
      {
        pertemuan: 5,
        tanggal: "21 Sep 2026",
        materi: "State Management & React Hooks",
        status: "Izin",
      },
      {
        pertemuan: 6,
        tanggal: "28 Sep 2026",
        materi: "React Router & Single Page Application",
        status: "Hadir",
      },
      {
        pertemuan: 7,
        tanggal: "05 Okt 2026",
        materi: "Fetching Data & Restful API Integration",
        status: "Hadir",
      },
      {
        pertemuan: 8,
        tanggal: "12 Okt 2026 (Hari Ini)",
        materi: "Mini Project Frontend Web Portal",
        status: "Belum Presensi",
        isToday: true,
      },
    ],
  },
  {
    // Mata kuliah contoh dengan kehadiran rendah (< 75%) untuk menguji badge peringatan merah!
    courseId: "CSG4C3",
    kode: "CSG4C3",
    nama: "MACHINE LEARNING",
    dosen: "Dr. Putu Harry Gunawan (PHG)",
    pertemuanList: [
      {
        pertemuan: 1,
        tanggal: "26 Agu 2026",
        materi: "Introduction to Machine Learning Paradigms",
        status: "Hadir",
      },
      {
        pertemuan: 2,
        tanggal: "02 Sep 2026",
        materi: "Linear Regression & Gradient Descent",
        status: "Hadir",
      },
      {
        pertemuan: 3,
        tanggal: "09 Sep 2026",
        materi: "Logistic Regression & Classification",
        status: "Alpha",
      },
      {
        pertemuan: 4,
        tanggal: "16 Sep 2026",
        materi: "Support Vector Machines (SVM)",
        status: "Alpha",
      },
      {
        pertemuan: 5,
        tanggal: "23 Sep 2026",
        materi: "Decision Trees & Random Forests",
        status: "Sakit",
      },
      {
        pertemuan: 6,
        tanggal: "30 Sep 2026",
        materi: "Neural Networks Fundamentals",
        status: "Hadir",
      },
      {
        pertemuan: 7,
        tanggal: "07 Okt 2026",
        materi: "Convolutional Neural Networks (CNN)",
        status: "Hadir",
      },
    ],
  },
];
