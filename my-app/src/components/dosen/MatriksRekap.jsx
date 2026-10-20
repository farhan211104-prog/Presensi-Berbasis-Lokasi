import { useState, useMemo } from "react";
import { useAttendance } from "../../context/AttendanceContext";
import ModalUbahStatus from "./ModalUbahStatus";
import { eksporRekapMingguanCSV } from "../../utils/csv";

// Komponen Matriks Rekap Minggu 1 s/d 15 (Tab 2 pada Detail Matkul Dosen)
export default function MatriksRekap({ course }) {
  const { getMatriksRekapKelas, ubahStatusManualDosen } = useAttendance();

  // State pencarian, pengurutan, dan modal
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("nama"); // "nama", "persen_asc", "persen_desc"
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // { mhs, pertemuan, status, catatan }

  // Ambil data matriks presensi untuk kelas ini
  const matriksData = getMatriksRekapKelas(course.id);

  // Ubah ke bentuk array dan terapkan filter & sorting
  const processedList = useMemo(() => {
    let list = Object.values(matriksData);

    // Filter nama / NIM
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.mhs.nama.toLowerCase().includes(q) || item.mhs.nim.includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "nama") {
        return a.mhs.nama.localeCompare(b.mhs.nama);
      }
      if (sortBy === "persen_asc") {
        return a.stats.persen - b.stats.persen;
      }
      if (sortBy === "persen_desc") {
        return b.stats.persen - a.stats.persen;
      }
      return 0;
    });

    return list;
  }, [matriksData, searchQuery, sortBy]);

  // Handler klik pada sel matriks untuk mengubah status pertemuan tersebut
  const handleCellClick = (mhs, pertemuanKe, pData) => {
    // Pertemuan masa depan (status "-") tetap bisa diedit jika dosen ingin memberi izin/sakit di awal
    setEditTarget({
      mhs,
      pertemuan: pertemuanKe,
      status: pData.status,
      catatan: pData.catatan || "",
    });
    setModalOpen(true);
  };

  // Simpan status dari modal
  const handleSaveModal = (newStatus, catatan) => {
    if (!editTarget) return;
    ubahStatusManualDosen(
      course.id,
      editTarget.pertemuan,
      editTarget.mhs.nim,
      newStatus,
      catatan
    );
  };

  // Simbol dan warna status pada sel matriks
  const renderCellBadge = (status) => {
    switch (status) {
      case "Hadir":
        return <span className="matrix-cell cell-h" title="Hadir">H</span>;
      case "Terlambat":
        return <span className="matrix-cell cell-t" title="Terlambat">T</span>;
      case "Izin":
        return <span className="matrix-cell cell-i" title="Izin">I</span>;
      case "Sakit":
        return <span className="matrix-cell cell-s" title="Sakit">S</span>;
      case "Alpha":
        return <span className="matrix-cell cell-a" title="Alpha">A</span>;
      case "Belum Presensi":
        return <span className="matrix-cell cell-belum" title="Belum Presensi">?</span>;
      default:
        return <span className="matrix-cell cell-empty" title="Belum berlangsung">-</span>;
    }
  };

  // Handler ekspor CSV matriks lengkap
  const handleEksporCSV = () => {
    eksporRekapMingguanCSV(course, matriksData);
  };

  return (
    <div className="matriks-rekap-container">
      {/* 1. Kontrol Atas: Search, Sort, dan Tombol Unduh CSV */}
      <div className="matriks-controls-row">
        <div className="matriks-search-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="matriks-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama / NIM..."
          />
        </div>

        <div className="matriks-sort-wrap">
          <label className="matriks-sort-label">Urutkan:</label>
          <select
            className="matriks-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="nama">Nama (A-Z)</option>
            <option value="persen_asc">Kehadiran Terendah (Berisiko)</option>
            <option value="persen_desc">Kehadiran Tertinggi</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleEksporCSV}
          className="btn-download-csv"
          title="Unduh seluruh rekap minggu 1-15 ke file CSV Excel"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Unduh Rekap CSV</span>
        </button>
      </div>

      {/* 2. Keterangan / Legenda Simbol */}
      <div className="matrix-legend-row">
        <span className="legend-title">Keterangan:</span>
        <span className="legend-chip"><span className="matrix-cell cell-h">H</span> Hadir</span>
        <span className="legend-chip"><span className="matrix-cell cell-t">T</span> Terlambat</span>
        <span className="legend-chip"><span className="matrix-cell cell-i">I</span> Izin</span>
        <span className="legend-chip"><span className="matrix-cell cell-s">S</span> Sakit</span>
        <span className="legend-chip"><span className="matrix-cell cell-a">A</span> Alpha</span>
        <span className="legend-chip"><span className="matrix-cell cell-belum">?</span> Belum</span>
        <span className="legend-chip"><span className="matrix-cell cell-empty">-</span> Belum Ada</span>
        <span className="legend-note">*Klik pada sel untuk mengubah status pertemuan</span>
      </div>

      {/* 3. Tabel Matriks (Scroll Horizontal di HP, Kolom Nama Sticky di Kiri) */}
      <div className="matrix-table-scroll-wrapper">
        <table className="matrix-table">
          <thead>
            <tr>
              <th className="th-sticky-name">Nama Mahasiswa</th>
              <th className="th-nim">NIM</th>
              {Array.from({ length: 15 }, (_, i) => i + 1).map((m) => (
                <th key={m} className={`th-pertemuan ${m === 8 ? "th-today" : ""}`}>
                  M{m}
                </th>
              ))}
              <th className="th-summary-stat">H</th>
              <th className="th-summary-stat">T</th>
              <th className="th-summary-stat">I</th>
              <th className="th-summary-stat">S</th>
              <th className="th-summary-stat">A</th>
              <th className="th-persen">% Kehadiran</th>
            </tr>
          </thead>
          <tbody>
            {processedList.map(({ mhs, riwayat, stats }) => {
              const isFarhan = mhs.nim === "101012300373";
              const isBerisiko = stats.berisiko;

              return (
                <tr
                  key={mhs.nim}
                  className={`matrix-row ${isBerisiko ? "row-berisiko" : ""} ${
                    isFarhan ? "row-farhan" : ""
                  }`}
                >
                  {/* Kolom Nama Sticky */}
                  <td className="td-sticky-name">
                    <div className="matrix-name-cell">
                      <span className="matrix-nama">{mhs.nama}</span>
                      {isFarhan && <span className="pill-mini-farhan">Demo</span>}
                      {isBerisiko && <span className="pill-mini-warning">&lt;75%</span>}
                    </div>
                  </td>

                  {/* Kolom NIM */}
                  <td className="td-nim">{mhs.nim}</td>

                  {/* Kolom Minggu 1 s/d 15 (Bisa diklik untuk ubah status manual) */}
                  {Array.from({ length: 15 }, (_, i) => i + 1).map((m) => {
                    const pData = riwayat[m] || { status: "-" };
                    return (
                      <td
                        key={m}
                        className={`td-cell-click ${m === 8 ? "td-today" : ""}`}
                        onClick={() => handleCellClick(mhs, m, pData)}
                        title={`Klik untuk ubah status ${mhs.nama} pada Minggu ke-${m}`}
                      >
                        {renderCellBadge(pData.status)}
                      </td>
                    );
                  })}

                  {/* Ringkasan Angka */}
                  <td className="td-stat">{stats.hadir}</td>
                  <td className="td-stat stat-t">{stats.terlambat}</td>
                  <td className="td-stat">{stats.izin}</td>
                  <td className="td-stat">{stats.sakit}</td>
                  <td className="td-stat stat-a">{stats.alpha}</td>

                  {/* Persentase Kehadiran */}
                  <td className="td-persen">
                    <span
                      className={`matrix-percent-badge ${
                        isBerisiko ? "badge-percent-danger" : "badge-percent-safe"
                      }`}
                    >
                      {stats.persen}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Ubah Status saat Sel Diklik */}
      {editTarget && (
        <ModalUbahStatus
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditTarget(null);
          }}
          mahasiswa={editTarget.mhs}
          pertemuanKe={editTarget.pertemuan}
          statusSaatIni={editTarget.status}
          catatanSaatIni={editTarget.catatan}
          onSave={handleSaveModal}
        />
      )}
    </div>
  );
}
