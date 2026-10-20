// ============================================================================
// UTILITAS EKSPOR DATA PRESENSI KE FORMAT CSV (EXCEL COMPATIBLE)
// Menggunakan UTF-8 BOM (\uFEFF) agar terbaca rapi dengan aksen/karakter di Excel
// ============================================================================

/**
 * Memicu pengunduhan file CSV di browser tanpa library eksternal
 *
 * @param {string} csvContent - Konten CSV
 * @param {string} fileName - Nama file yang akan diunduh
 */
export function unduhFileCSV(csvContent, fileName = "rekap_presensi.csv") {
  // Tambahkan UTF-8 BOM (\uFEFF) di awal agar karakter dan koma dibaca benar oleh Microsoft Excel
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format string agar aman dalam sel CSV (menangani koma dan tanda kutip ganda)
 */
function escapeCSV(field) {
  if (field === null || field === undefined) return '""';
  const stringField = String(field);
  if (
    stringField.includes(",") ||
    stringField.includes('"') ||
    stringField.includes("\n")
  ) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return `"${stringField}"`;
}

/**
 * Ekspor Rekap Mingguan Minggu 1 s/d 15 ke format CSV
 */
export function eksporRekapMingguanCSV(matkul, daftarMahasiswa, matriksData) {
  const baris = [];

  // Header informasi mata kuliah
  baris.push([escapeCSV("REKAP PRESENSI KELAS - TELKOM UNIVERSITY")]);
  baris.push([
    escapeCSV(`Mata Kuliah: ${matkul.kode} - ${matkul.nama}`),
    escapeCSV(`Dosen: ${matkul.namaDosen}`),
    escapeCSV(`Jadwal: ${matkul.waktu} (${matkul.ruangan})`),
  ]);
  baris.push([]); // Baris kosong

  // Header kolom tabel rekap
  const header = [
    "No",
    "NIM",
    "Nama Mahasiswa",
    ...Array.from({ length: 15 }, (_, i) => `Minggu ${i + 1}`),
    "Hadir",
    "Terlambat",
    "Izin",
    "Sakit",
    "Alpha",
    "Kehadiran (%)",
    "Status Kelulusan",
  ];
  baris.push(header.map(escapeCSV).join(","));

  // Isi data setiap mahasiswa
  daftarMahasiswa.forEach((mhs, idx) => {
    const dataMhs = matriksData[mhs.nim] || {};
    const riwayat = dataMhs.riwayat || {};
    const stats = dataMhs.stats || {
      hadir: 0,
      terlambat: 0,
      izin: 0,
      sakit: 0,
      alpha: 0,
      persen: 0,
    };

    const kolomMinggu = Array.from({ length: 15 }, (_, i) => {
      const p = riwayat[i + 1];
      if (!p) return "-";
      return p.status || "-";
    });

    const statusLulus =
      stats.persen >= 75 ? "Memenuhi Syarat" : "Peringatan (< 75%)";

    const row = [
      idx + 1,
      `'${mhs.nim}`, // Kutip tanda kutip satu agar format teks tidak diubah angka oleh Excel
      mhs.nama,
      ...kolomMinggu,
      stats.hadir,
      stats.terlambat,
      stats.izin,
      stats.sakit,
      stats.alpha,
      `${stats.persen}%`,
      statusLulus,
    ];

    baris.push(row.map(escapeCSV).join(","));
  });

  const csvContent = baris.join("\r\n");
  const fileName = `Rekap_Presensi_${matkul.kode}_Minggu_1-15.csv`;
  unduhFileCSV(csvContent, fileName);
}

/**
 * Ekspor Data Presensi Pertemuan Tertentu ke CSV
 */
export function eksporPresensiPertemuanCSV(
  matkul,
  pertemuanKe,
  daftarPresensi
) {
  const baris = [];

  // Header informasi perkuliahan
  baris.push([
    escapeCSV(
      `PRESENSI PERTEMUAN MINGGU KE-${pertemuanKe} - ${matkul.kode} ${matkul.nama}`
    ),
  ]);
  baris.push([
    escapeCSV(`Dosen Pengampu: ${matkul.namaDosen}`),
    escapeCSV(`Ruangan: ${matkul.ruangan}`),
    escapeCSV(`Jadwal: ${matkul.waktu}`),
  ]);
  baris.push([]);

  // Header kolom tabel
  const header = [
    "No",
    "NIM",
    "Nama Mahasiswa",
    "Status Kehadiran",
    "Jam Presensi",
    "Jarak GPS (m)",
    "Metode Verifikasi",
    "Keterangan",
  ];
  baris.push(header.map(escapeCSV).join(","));

  // Baris data per mahasiswa
  daftarPresensi.forEach((item, idx) => {
    const row = [
      idx + 1,
      `'${item.nim}`,
      item.nama,
      item.status,
      item.jam || "-",
      item.jarak !== null && item.jarak !== undefined ? `${item.jarak} m` : "-",
      item.metode || "Manual / Belum",
      item.catatan || (item.diubahDosen ? "Diubah Dosen" : "-"),
    ];
    baris.push(row.map(escapeCSV).join(","));
  });

  const csvContent = baris.join("\r\n");
  const fileName = `Presensi_${matkul.kode}_Pertemuan_${pertemuanKe}.csv`;
  unduhFileCSV(csvContent, fileName);
}
