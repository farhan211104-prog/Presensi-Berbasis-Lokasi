import { useState, useEffect, useCallback } from "react";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import api from "../api/client";

export default function Rekap() {
  // State untuk daftar mata kuliah dari server
  const [mataKuliahList, setMataKuliahList] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  
  // State untuk data rekap dan status pemuatan dari server
  const [rekapData, setRekapData] = useState(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingRekap, setLoadingRekap] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 1. Ambil daftar mata kuliah mahasiswa saat halaman Rekap dibuka
  const fetchMataKuliah = useCallback(async () => {
    try {
      setLoadingCourses(true);
      setErrorMessage("");
      const res = await api.get("/mata-kuliah");
      const list = res.mataKuliah || res.data || [];
      setMataKuliahList(list);

      // Otomatis pilih mata kuliah pertama jika ada
      if (list.length > 0) {
        setSelectedCourseId(list[0].id);
      }
    } catch (err) {
      console.error("Gagal memuat mata kuliah:", err);
      setErrorMessage(err.message || "Gagal memuat daftar mata kuliah");
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  useEffect(() => {
    fetchMataKuliah();
  }, [fetchMataKuliah]);

  // 2. Ambil data rekap kehadiran setiap kali selectedCourseId berubah
  const fetchRekap = useCallback(async (courseId) => {
    if (!courseId) return;
    try {
      setLoadingRekap(true);
      setErrorMessage("");
      const res = await api.get(`/rekap?mataKuliahId=${courseId}`);
      setRekapData(res);
    } catch (err) {
      console.error("Gagal memuat rekap kehadiran:", err);
      setErrorMessage(err.message || "Gagal memuat data rekap kehadiran");
      setRekapData(null);
    } finally {
      setLoadingRekap(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchRekap(selectedCourseId);
    }
  }, [selectedCourseId, fetchRekap]);

  // Data mata kuliah aktif saat ini
  const currentCourse = mataKuliahList.find(
    (c) => String(c.id) === String(selectedCourseId)
  ) || rekapData?.mataKuliah;

  const ringkasan = rekapData?.ringkasan || {
    totalPertemuanBerjalan: 0,
    hadir: 0,
    terlambat: 0,
    izin: 0,
    sakit: 0,
    alpha: 0,
    totalMasuk: 0,
    persentaseKehadiran: 0,
    peringatan: false,
  };

  const pertemuanList = rekapData?.pertemuan || [];
  const isBelowThreshold = Boolean(ringkasan.peringatan);

  // Helper kelas warna badge status kehadiran
  const getStatusBadgeStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "hadir":
        return "badge-status-hadir";
      case "terlambat":
        return "badge-status-terlambat";
      case "izin":
        return "badge-status-izin";
      case "sakit":
        return "badge-status-sakit";
      case "alpha":
        return "badge-status-alpha";
      default:
        return "badge-status-pending";
    }
  };

  // Helper label status untuk badge
  const renderStatusLabel = (item) => {
    const s = item.status?.toLowerCase();
    if (s === "hadir") return "Hadir";
    if (s === "terlambat") {
      return item.selisihMenitTerlambat > 0
        ? `Terlambat (${item.selisihMenitTerlambat}m)`
        : "Terlambat";
    }
    if (s === "izin") return "Izin";
    if (s === "sakit") return "Sakit";
    if (s === "alpha") return "Alpha";
    return "Belum Presensi";
  };

  return (
    <div className="mobile-page-wrapper">
      {/* Header dengan tombol kembali ke Beranda */}
      <Header variant="subpage" title="Rekap Kehadiran" />

      <main className="subpage-content">
        {/* Pesan Error jika terjadi kendala jaringan / server */}
        {errorMessage && (
          <div className="danger-warning-banner" style={{ marginBottom: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div style={{ flex: 1 }}>
              <strong>Terjadi Kesalahan</strong>
              <p>{errorMessage}</p>
            </div>
            <button
              onClick={() => (selectedCourseId ? fetchRekap(selectedCourseId) : fetchMataKuliah())}
              style={{
                background: "none",
                border: "1px solid #DC2626",
                color: "#DC2626",
                borderRadius: 6,
                padding: "2px 8px",
                fontSize: "0.75rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Dropdown Pilihan Mata Kuliah */}
        <div className="course-select-card">
          <label htmlFor="course-dropdown" className="course-select-label">
            Pilih Mata Kuliah
          </label>
          <div className="select-wrapper">
            <select
              id="course-dropdown"
              className="course-dropdown"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              disabled={loadingCourses || mataKuliahList.length === 0}
            >
              {loadingCourses ? (
                <option value="">Memuat daftar mata kuliah...</option>
              ) : mataKuliahList.length === 0 ? (
                <option value="">Tidak ada mata kuliah</option>
              ) : (
                mataKuliahList.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.kode} - {course.nama}
                  </option>
                ))
              )}
            </select>
            <div className="select-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
          <p className="course-lecturer-info">
            Dosen:{" "}
            {currentCourse?.dosen?.nama
              ? `${currentCourse.dosen.nama} (${currentCourse.dosen.kode || "-"})`
              : "Belum Ditentukan"}
          </p>
        </div>

        {/* State Loading Data Rekap */}
        {loadingRekap && (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              background: "#FFF",
              borderRadius: 16,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              color: "#64748B",
              fontSize: "0.85rem",
            }}
          >
            Memuat rekap kehadiran dari server...
          </div>
        )}

        {/* Konten Rekap Kehadiran dari Server */}
        {!loadingRekap && rekapData && (
          <>
            {/* Ringkasan Kehadiran: Total, Hadir/Terlambat/Izin/Sakit/Alpha, Progress Bar */}
            <div className="rekap-summary-card">
              <div className="rekap-header-row">
                <div>
                  <span className="summary-title-small">Persentase Kehadiran</span>
                  <div className="percentage-display">
                    <span className={`percent-num ${isBelowThreshold ? "danger-text" : "safe-text"}`}>
                      {ringkasan.persentaseKehadiran}%
                    </span>
                    <span className="percent-sub">
                      ({ringkasan.totalMasuk} dari {ringkasan.totalPertemuanBerjalan} Pertemuan)
                    </span>
                  </div>
                </div>

                {/* Status Keamanan */}
                <div className={`threshold-tag ${isBelowThreshold ? "danger-tag" : "safe-tag"}`}>
                  {isBelowThreshold ? "Rawan Tidak Lulus" : "Memenuhi Syarat"}
                </div>
              </div>

              {/* Progress Bar Kehadiran */}
              <div className="progress-bar-track">
                <div
                  className={`progress-bar-fill ${isBelowThreshold ? "fill-danger" : "fill-safe"}`}
                  style={{ width: `${Math.min(ringkasan.persentaseKehadiran, 100)}%` }}
                />
              </div>

              {/* Grid 5 Indikator: Hadir, Terlambat (Kuning), Izin, Sakit (Ungu), Alpha (Merah) */}
              <div className="attendance-counts-grid counts-grid-5">
                <div className="count-pill pill-hadir">
                  <span className="count-pill-num">{ringkasan.hadir}</span>
                  <span className="count-pill-label">Hadir</span>
                </div>
                <div className="count-pill pill-terlambat">
                  <span className="count-pill-num">{ringkasan.terlambat}</span>
                  <span className="count-pill-label">Terlambat</span>
                </div>
                <div className="count-pill pill-izin">
                  <span className="count-pill-num">{ringkasan.izin}</span>
                  <span className="count-pill-label">Izin</span>
                </div>
                <div className="count-pill pill-sakit">
                  <span className="count-pill-num">{ringkasan.sakit}</span>
                  <span className="count-pill-label">Sakit</span>
                </div>
                <div className="count-pill pill-alpha">
                  <span className="count-pill-num">{ringkasan.alpha}</span>
                  <span className="count-pill-label">Alpha</span>
                </div>
              </div>

              {/* Banner Peringatan Merah jika Kehadiran di Bawah 75% */}
              {isBelowThreshold && (
                <div className="danger-warning-banner" role="alert" style={{ marginTop: 12 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <strong>Peringatan Kehadiran!</strong>
                    <p>
                      Tingkat kehadiran Anda di bawah 75%. Anda berisiko tidak diperkenankan mengikuti Ujian Akhir Semester (UAS).
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Daftar Pertemuan Berjalan */}
            <div className="meetings-list-section">
              <div className="section-header-row">
                <h4 className="section-title">Riwayat Pertemuan Berjalan</h4>
                <span className="count-badge">{pertemuanList.length} Pertemuan</span>
              </div>

              {pertemuanList.length === 0 ? (
                <div
                  style={{
                    padding: 20,
                    textAlign: "center",
                    background: "#FFF",
                    borderRadius: 14,
                    color: "#94A3B8",
                    fontSize: "0.85rem",
                  }}
                >
                  Belum ada pertemuan yang berlangsung pada semester ini.
                </div>
              ) : (
                <div className="timeline-meetings">
                  {pertemuanList.map((item) => (
                    <div
                      key={item.mingguKe}
                      className={`meeting-card ${item.isToday ? "meeting-today-card" : ""}`}
                    >
                      <div className="meeting-card-left">
                        <div className="meeting-number-badge">
                          P-{item.mingguKe}
                        </div>
                        <div className="meeting-content">
                          <div className="meeting-date-row">
                            <span className="meeting-date">{item.tanggal}</span>
                            {item.isToday && (
                              <span className="pill-today-active">Hari Ini</span>
                            )}
                          </div>
                          <p className="meeting-materi">{item.catatan}</p>
                          {item.waktuPresensi && (
                            <span className="meeting-jam-info">
                              🕒 Presensi: {item.waktuPresensi.includes("T") ? item.waktuPresensi.split("T")[1]?.slice(0, 5) : item.waktuPresensi.slice(11, 16)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Badge Status Kehadiran */}
                      <div className="meeting-card-right">
                        <span className={`status-badge-meeting ${getStatusBadgeStyle(item.status)}`}>
                          {renderStatusLabel(item)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}
