// ============================================================================
// DATA DUMMY KHUSUS DOSEN PENGAMPU (Dr. Bayu Rima Pratama, S.T., M.T. / BRP)
// ============================================================================

// 1. Tiga Mata Kuliah yang Diampu oleh Dosen BRP
export const MATKUL_DOSEN_BRP = [
  {
    id: "AZK4BAA2",
    kode: "AZK4BAA2",
    nama: "PROPOSAL TUGAS AKHIR",
    sks: 2,
    hari: "Senin",
    waktu: "14:30 - 16:30",
    ruangan: "KU3.08.06",
    kodeDosen: "BRP",
    namaDosen: "Dr. Bayu Rima Pratama, S.T., M.T.",
    isHariIni: true, // Kuliah yang sedang berlangsung hari ini
    materiPertemuan: {
      1: "Kontrak Perkuliahan & Penjelasan Alur Tugas Akhir",
      2: "Identifikasi Masalah & Perumusan Topik Riset",
      3: "Studi Literatur & Systematic Literature Review",
      4: "Penyusunan Bab 1 Pendahuluan & Hipotesis",
      5: "Metodologi Penelitian & Desain Sistem",
      6: "Evaluasi Draft Bab 1 dan Bab 2",
      7: "Penyusunan Bab 3 Metodologi & Rencana Pengujian",
      8: "Review Progress Bab 1-3 & Persiapan Seminar Proposal", // Hari ini
      9: "Simulasi Presentasi Seminar Proposal",
      10: "Perbaikan Proposal Pasca Seminar",
      11: "Penyusunan Instrumen Pengumpulan Data",
      12: "Implementasi Prototipe Sistem Tahap 1",
      13: "Implementasi Prototipe Sistem Tahap 2",
      14: "Pengujian Fungsionalitas & Akurasi Model",
      15: "Finalisasi Draft Laporan Tugas Akhir",
    },
  },
  {
    id: "CSG4C3",
    kode: "CSG4C3",
    nama: "MACHINE LEARNING",
    sks: 3,
    hari: "Selasa",
    waktu: "09:30 - 12:30",
    ruangan: "IF-03-01",
    kodeDosen: "BRP",
    namaDosen: "Dr. Bayu Rima Pratama, S.T., M.T.",
    isHariIni: false,
    materiPertemuan: {
      1: "Introduction to Machine Learning Paradigms",
      2: "Linear Regression & Gradient Descent",
      3: "Logistic Regression & Classification",
      4: "Support Vector Machines (SVM)",
      5: "Decision Trees & Random Forests",
      6: "Neural Networks Fundamentals",
      7: "Convolutional Neural Networks (CNN)",
      8: "Recurrent Neural Networks (RNN) & LSTM",
      9: "Evaluation Metrics & Cross Validation",
      10: "Clustering Algorithms (K-Means & DBSCAN)",
      11: "Dimensionality Reduction (PCA & t-SNE)",
      12: "Ensemble Learning (Boosting & Bagging)",
      13: "Natural Language Processing Basics",
      14: "Deep Learning with PyTorch",
      15: "Review & Proyek Akhir Machine Learning",
    },
  },
  {
    id: "CSG3J3",
    kode: "CSG3J3",
    nama: "KECERDASAN BUATAN LANJUT",
    sks: 3,
    hari: "Kamis",
    waktu: "13:30 - 16:30",
    ruangan: "TULT-08-02",
    kodeDosen: "BRP",
    namaDosen: "Dr. Bayu Rima Pratama, S.T., M.T.",
    isHariIni: false,
    materiPertemuan: {
      1: "Pengantar Sistem Cerdas & Agen Otonom",
      2: "Pencarian Heuristik & Algoritma A*",
      3: "Adversarial Search & Game Playing (Minimax)",
      4: "Constraint Satisfaction Problems (CSP)",
      5: "Penalaran Berbasis Logika Proposisi & First-Order",
      6: "Inference Engine & Sistem Pakar",
      7: "Fuzzy Logic & Fuzzy Inference System",
      8: "Algoritma Genetika & Optimasi",
      9: "Reinforcement Learning: Markov Decision Process",
      10: "Q-Learning & Deep Q-Network (DQN)",
      11: "Multi-Agent Systems & Kolaborasi",
      12: "Explainable AI (XAI) Concepts",
      13: "Etika & Keamanan dalam AI",
      14: "Presentasi Studi Kasus Sistem Cerdas",
      15: "Evaluasi Akhir Mata Kuliah",
    },
  },
];

// 2. Daftar Mahasiswa per Mata Kuliah (Ahmad Farhan Fitrian WAJIB ada di AZK4BAA2)
export const MAHASISWA_PER_MATKUL = {
  AZK4BAA2: [
    {
      nim: "101012300373",
      nama: "Ahmad Farhan Fitrian",
      email: "farhan@student.telkomuniversity.ac.id",
      isUserAsli: true, // Akun yang login di halaman mahasiswa
    },
    {
      nim: "101012300102",
      nama: "Alifia Nurul Hidayah",
      email: "alifia@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300145",
      nama: "Budi Santoso",
      email: "budi@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300188",
      nama: "Citra Dewi Lestari",
      email: "citra@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300215",
      nama: "Daffa Raditya Pratama",
      email: "daffa@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300249",
      nama: "Elsa Safira",
      email: "elsa@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300288",
      nama: "Gita Permata Sari",
      email: "gita@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300312",
      nama: "Hafizh Rabbani",
      email: "hafizh@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300356",
      nama: "Intan Kusuma Wardani",
      email: "intan@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300399",
      nama: "Joko Wibowo",
      email: "joko@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300430",
      nama: "Kevin Jonathan",
      email: "kevin@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300477",
      nama: "Lina Marlina",
      email: "lina@student.telkomuniversity.ac.id",
    },
  ],
  CSG4C3: [
    {
      nim: "101012300102",
      nama: "Alifia Nurul Hidayah",
      email: "alifia@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300145",
      nama: "Budi Santoso",
      email: "budi@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300215",
      nama: "Daffa Raditya Pratama",
      email: "daffa@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300288",
      nama: "Gita Permata Sari",
      email: "gita@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300356",
      nama: "Intan Kusuma Wardani",
      email: "intan@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300399",
      nama: "Joko Wibowo",
      email: "joko@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300430",
      nama: "Kevin Jonathan",
      email: "kevin@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300511",
      nama: "Mochammad Rizky",
      email: "rizky@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300542",
      nama: "Nabila Putri Maharani",
      email: "nabila@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300588",
      nama: "Oscar Pratama",
      email: "oscar@student.telkomuniversity.ac.id",
    },
  ],
  CSG3J3: [
    {
      nim: "101012300188",
      nama: "Citra Dewi Lestari",
      email: "citra@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300249",
      nama: "Elsa Safira",
      email: "elsa@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300312",
      nama: "Hafizh Rabbani",
      email: "hafizh@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300477",
      nama: "Lina Marlina",
      email: "lina@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300511",
      nama: "Mochammad Rizky",
      email: "rizky@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300542",
      nama: "Nabila Putri Maharani",
      email: "nabila@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300601",
      nama: "Pandu Wijaya",
      email: "pandu@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300635",
      nama: "Qonita Zahra",
      email: "qonita@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300672",
      nama: "Reza Mahendra",
      email: "reza@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300705",
      nama: "Siti Rahmawati",
      email: "siti@student.telkomuniversity.ac.id",
    },
    {
      nim: "101012300744",
      nama: "Tegar Nugroho",
      email: "tegar@student.telkomuniversity.ac.id",
    },
  ],
};

// 3. Pola Riwayat Statis Minggu 1 s/d 7 untuk Mahasiswa Dummy
// Variasi status: Hadir, Terlambat, Izin, Sakit, Alpha. Beberapa sengaja berisiko (< 75%).
export const DUMMY_ATTENDANCE_PATTERNS = {
  "101012300102": ["Hadir", "Hadir", "Hadir", "Terlambat", "Hadir", "Hadir", "Hadir"], // Rajin
  "101012300145": ["Hadir", "Terlambat", "Hadir", "Hadir", "Izin", "Terlambat", "Hadir"], // Sering terlambat
  "101012300188": ["Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Hadir"], // Sempurna 100%
  "101012300215": ["Alpha", "Hadir", "Alpha", "Hadir", "Alpha", "Sakit", "Hadir"], // Berisiko < 75%
  "101012300249": ["Hadir", "Hadir", "Izin", "Hadir", "Hadir", "Hadir", "Hadir"],
  "101012300288": ["Hadir", "Sakit", "Hadir", "Hadir", "Terlambat", "Hadir", "Hadir"],
  "101012300312": ["Alpha", "Alpha", "Hadir", "Alpha", "Hadir", "Alpha", "Hadir"], // Berisiko tinggi (< 50%)
  "101012300356": ["Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Izin", "Hadir"],
  "101012300399": ["Terlambat", "Hadir", "Terlambat", "Hadir", "Hadir", "Terlambat", "Hadir"], // Sering terlambat
  "101012300430": ["Hadir", "Hadir", "Alpha", "Hadir", "Hadir", "Hadir", "Hadir"],
  "101012300477": ["Hadir", "Hadir", "Hadir", "Sakit", "Hadir", "Hadir", "Hadir"],
  // Tambahan untuk kelas lain
  "101012300511": ["Hadir", "Hadir", "Hadir", "Terlambat", "Hadir", "Hadir", "Hadir"],
  "101012300542": ["Alpha", "Hadir", "Alpha", "Hadir", "Alpha", "Hadir", "Hadir"], // Berisiko
  "101012300588": ["Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Hadir"],
  "101012300601": ["Hadir", "Terlambat", "Hadir", "Terlambat", "Hadir", "Hadir", "Hadir"],
  "101012300635": ["Hadir", "Hadir", "Izin", "Hadir", "Hadir", "Sakit", "Hadir"],
  "101012300672": ["Alpha", "Alpha", "Alpha", "Hadir", "Hadir", "Hadir", "Hadir"], // Berisiko
  "101012300705": ["Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Hadir"],
  "101012300744": ["Hadir", "Hadir", "Terlambat", "Hadir", "Hadir", "Hadir", "Hadir"],
};

// Data preset dummy presensi hari ini (Minggu ke-8) untuk mahasiswa selain Farhan
export const DUMMY_PRESENSI_HARI_INI_LAINNYA = {
  "101012300102": {
    status: "Hadir",
    jam: "14:25",
    jarak: 8,
    metode: "face-recognition-simulasi",
  },
  "101012300145": {
    status: "Terlambat",
    jam: "14:52",
    jarak: 14,
    catatan: "Terlambat 22 menit",
    metode: "face-recognition-simulasi",
  },
  "101012300188": {
    status: "Hadir",
    jam: "14:28",
    jarak: 5,
    metode: "face-recognition-simulasi",
  },
  "101012300215": {
    status: "Belum Presensi",
    jam: null,
    jarak: null,
    metode: null,
  },
  "101012300249": {
    status: "Hadir",
    jam: "14:31",
    jarak: 11,
    metode: "face-recognition-simulasi",
  },
  "101012300288": {
    status: "Izin",
    jam: null,
    catatan: "Izin lomba riset mahasiswa",
    diubahDosen: true,
  },
  "101012300312": {
    status: "Belum Presensi",
    jam: null,
    jarak: null,
    metode: null,
  },
  "101012300356": {
    status: "Hadir",
    jam: "14:29",
    jarak: 9,
    metode: "face-recognition-simulasi",
  },
  "101012300399": {
    status: "Terlambat",
    jam: "14:58",
    jarak: 18,
    catatan: "Terlambat 28 menit",
    metode: "face-recognition-simulasi",
  },
  "101012300430": {
    status: "Hadir",
    jam: "14:22",
    jarak: 6,
    metode: "face-recognition-simulasi",
  },
  "101012300477": {
    status: "Sakit",
    jam: null,
    catatan: "Surat keterangan sakit klinik",
    diubahDosen: true,
  },
};
