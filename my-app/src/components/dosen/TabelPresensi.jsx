import { useState, useMemo } from "react";
import { useAttendance } from "../../context/AttendanceContext";
import BadgeStatus from "./BadgeStatus";
import ModalUbahStatus from "./ModalUbahStatus";
import { eksporPresensiPertemuanCSV } from "../../utils/csv";

// Komponen Presensi per Pertemuan (Tab 1 pada Detail Matkul Dosen)
export default function TabelPresensi({
  course,
  pertemuanKe,
  setPertemuanKe,
}) {
  const {
    getPresensiKelasPertemuan,
    ubahStatusManualDosen,
    tandaiSemuaBelumPresensiAlpha,
    catatanMateri,
    simpanCatatanMateri,
  } = useAttendance();

  // State pencarian & filter status
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("SEMUA");

  // State modal pengubahan status manual
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMhs, setSelectedMhs] = useState(null);

  // State catatan materi pertemuan
  const keyMateri = `${course.id}_${pertemuanKe}`;
  const materiDefault = course.materiPertemuan?.[pertemuanKe] || "";
  const [materiInput, setMateriInput] = useState(() => catatanMateri[keyMateri] || materiDefault);
  const [materiFeedback, setMateriFeedback] = useState("");

  // Ambil data presensi untuk pertemuan terpilih
  const dataPertemuan = useAttendance().getPresensiKelasPertemuan(course.id, pertemuanKe);
  const { daftar, ringkasan } = dataPertemuan;

  // Filter daftar mahasiswa sesuai pencarian nama/NIM dan dropdown status
  const filteredList = useMemo(() => {
    return daftar.filter((item) => {
      const matchSearch =
        item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.nim.includes(searchQuery);

      const matchStatus =
        filterStatus === "SEMUA" ||
        item.status.toLowerCase() === filterStatus.toLowerCase();

      return matchSearch && matchStatus;
    });
  }, [daftar, searchQuery, filterStatus]);

  // Handler buka modal ubah status
  const handleOpenEditModal = (item) => {
    setSelectedMhs(item);
    setModalOpen(true);
  };

  // Handler simpan status dari modal
  const handleSaveStatus = (newStatus, catatan) => {
    if (!selectedMhs) return;
    ubahStatusManualDosen(
      course.id,
      pertemuanKe,
      selectedMhs.nim,
      newStatus,
      catatan
    );
  };

  // Handler "Tandai Semua Belum Presensi sebagai Alpha"
  const handleTandaiSemuaAlpha = () => {
    const konfirmasi = window.confirm(
      `Apakah Anda yakin ingin menandai seluruh mahasiswa yang belum presensi (${ringkasan.belum} orang) pada Pertemuan ${pertemuanKe} sebagai ALPHA?`
    );
    if (konfirmasi) {
      tandaiSemuaBelumPresensiAlpha(course.id, pertemuanKe);
    }
  };

  // Handler simpan materi perkuliahan
  const handleSimpanMateri = (e) => {
    e.preventDefault();
    simpanCatatanMateri(course.id, pertemuanKe, materiInput);
    setMateriFeedback("Catatan materi berhasil disimpan!");
    setTimeout(() => setMateriFeedback(""), 3000);
  };

  // Handler ekspor CSV pertemuan
  const handleEksporCSV = () => {
    eksporPresensiPertemuanCSV(course, pertemuanKe, daftar);
  };

  return (
    <div className="tabel-presensi-wrapper">
      {/* 1. Baris Pemilihan Pertemuan & Tombol Aksi */}
      <div className="pertemuan-selector-row">
        <div className="select-pertemuan-group">
          <label htmlFor="pilih-minggu" className="select-label">
            Pilih Pertemuan:
          </label>
          <select
            id="pilih-minggu"
            className="select-pertemuan-dropdown"
            value={pertemuanKe}
            onChange={(e) => {
              const p = Number(e.target.value);
              setPertemuanKe(p);
              setMateriInput(catatanMateri[`${course.id}_${p}`] || course.materiPertemuan?.[p] || "");
            }}
          >
            {Array.from({ length: 15 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                Minggu ke-{m} {m === 8 ? "(Hari Ini)" : m < 8 ? "(Selesai)" : "(Akan Datang)"}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleEksporCSV}
          className="btn-download-csv"
          title="Unduh data presensi pertemuan ini ke file CSV Excel"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Unduh CSV</span>
        </button>
      </div>

      {/* 2. Kartu Ringkasan Kehadiran Pertemuan */}
      <div className="dosen-summary-banner">
        <div className="banner-top-stats">
          <div>
            <span className="banner-stats-label">Kehadiran Pertemuan {pertemuanKe}</span>
            <div className="banner-percent-display">
              <span className="banner-percent-num">{ringkasan.persen}%</span>
              <span className="banner-percent-sub">
                ({ringkasan.hadir + ringkasan.terlambat} dari {ringkasan.total} Mahasiswa)
              </span>
            </div>
          </div>

          {/* Tombol Cepat: Tandai Semua Alpha */}
          {ringkasan.belum > 0 && (
            <button
              type="button"
              onClick={handleTandaiSemuaAlpha}
              className="btn-tandai-alpha"
              title="Set semua yang belum hadir menjadi Alpha otomatis"
            >
              ⚠️ Tandai Belum Hadir sbg Alpha ({ringkasan.belum})
            </button>
          )}
        </div>

        {/* Baris Badge Angka Per Status */}
        <div className="banner-chips-row">
          <div className="stat-chip chip-hadir">
            <span className="stat-chip-num">{ringkasan.hadir}</span>
            <span className="stat-chip-lbl">Hadir</span>
          </div>
          <div className="stat-chip chip-terlambat">
            <span className="stat-chip-num">{ringkasan.terlambat}</span>
            <span className="stat-chip-lbl">Terlambat</span>
          </div>
          <div className="stat-chip chip-izin">
            <span className="stat-chip-num">{ringkasan.izin}</span>
            <span className="stat-chip-lbl">Izin</span>
          </div>
          <div className="stat-chip chip-sakit">
            <span className="stat-chip-num">{ringkasan.sakit}</span>
            <span className="stat-chip-lbl">Sakit</span>
          </div>
          <div className="stat-chip chip-alpha">
            <span className="stat-chip-num">{ringkasan.alpha}</span>
            <span className="stat-chip-lbl">Alpha</span>
          </div>
          <div className="stat-chip chip-belum">
            <span className="stat-chip-num">{ringkasan.belum}</span>
            <span className="stat-chip-lbl">Belum</span>
          </div>
        </div>
      </div>

      {/* 3. Catatan Materi Perkuliahan */}
      <div className="catatan-materi-card">
        <div className="catatan-materi-header">
          <div className="catatan-header-left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8313A" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <strong>Materi / Silabus Minggu ke-{pertemuanKe}</strong>
          </div>
          {materiFeedback && <span className="catatan-saved-text">✓ {materiFeedback}</span>}
        </div>
        <form onSubmit={handleSimpanMateri} className="catatan-form">
          <input
            type="text"
            className="input-materi-text"
            value={materiInput}
            onChange={(e) => setMateriInput(e.target.value)}
            placeholder="Tuliskan pokok bahasan atau materi kuliah minggu ini..."
          />
          <button type="submit" className="btn-simpan-materi">
            Simpan
          </button>
        </form>
      </div>

      {/* 4. Filter & Pencarian Mahasiswa */}
      <div className="filter-search-box">
        <div className="search-input-wrapper">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-mhs-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau NIM mahasiswa..."
          />
          {searchQuery && (
            <button
              type="button"
              className="btn-clear-search"
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          )}
        </div>

        <div className="filter-status-wrapper">
          <select
            className="select-status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="SEMUA">Semua Status ({daftar.length})</option>
            <option value="Hadir">Hadir ({ringkasan.hadir})</option>
            <option value="Terlambat">Terlambat ({ringkasan.terlambat})</option>
            <option value="Izin">Izin ({ringkasan.izin})</option>
            <option value="Sakit">Sakit ({ringkasan.sakit})</option>
            <option value="Alpha">Alpha ({ringkasan.alpha})</option>
            <option value="Belum Presensi">Belum Presensi ({ringkasan.belum})</option>
          </select>
        </div>
      </div>

      {/* 5. Daftar Mahasiswa & Presensi */}
      <div className="dosen-mhs-list-container">
        {filteredList.length === 0 ? (
          <div className="empty-mhs-box">
            <p>Tidak ada data mahasiswa yang cocok dengan kriteria pencarian.</p>
          </div>
        ) : (
          filteredList.map((mhs) => {
            const isFarhan = mhs.nim === "101012300373";

            return (
              <div
                key={mhs.nim}
                className={`dosen-mhs-item-card ${isFarhan ? "mhs-farhan-highlight" : ""}`}
              >
                <div className="mhs-item-left">
                  <div className="mhs-avatar-initial">
                    {mhs.nama ? mhs.nama.substring(0, 2).toUpperCase() : "MH"}
                  </div>
                  <div className="mhs-item-info">
                    <div className="mhs-name-row">
                      <span className="mhs-nama-text">{mhs.nama}</span>
                      {isFarhan && <span className="tag-akun-anda">Akun Anda (Demo)</span>}
                    </div>
                    <span className="mhs-nim-text">NIM: {mhs.nim}</span>

                    {/* Informasi Jam & Lokasi Presensi */}
                    <div className="mhs-meta-presensi">
                      {mhs.jam ? (
                        <span className="mhs-jam-entry">
                          🕒 {mhs.jam}
                          {mhs.jarak !== null && mhs.jarak !== undefined
                            ? ` • Jarak ${mhs.jarak}m`
                            : ""}
                        </span>
                      ) : (
                        <span className="mhs-jam-empty">Belum melakukan presensi</span>
                      )}
                    </div>

                    {/* Label jika diubah manual oleh Dosen */}
                    {mhs.diubahDosen && (
                      <span className="badge-diubah-dosen">
                        ✏️ Diubah dosen {mhs.catatan ? `(${mhs.catatan})` : ""}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mhs-item-right">
                  <BadgeStatus
                    status={mhs.status}
                    keterangan={
                      mhs.status === "Terlambat" && mhs.selisihMenit
                        ? `+${mhs.selisihMenit}m`
                        : ""
                    }
                  />

                  {/* Tombol Ubah Status Manual */}
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(mhs)}
                    className="btn-edit-status-dosen"
                    title="Ubah status kehadiran mahasiswa ini secara manual"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    <span>Ubah</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Ubah Status Manual */}
      <ModalUbahStatus
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedMhs(null);
        }}
        mahasiswa={selectedMhs}
        pertemuanKe={pertemuanKe}
        statusSaatIni={selectedMhs?.status}
        catatanSaatIni={selectedMhs?.catatan}
        onSave={handleSaveStatus}
      />
    </div>
  );
}
