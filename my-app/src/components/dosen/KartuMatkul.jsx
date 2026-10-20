import { useNavigate } from "react-router-dom";
import { useAttendance } from "../../context/AttendanceContext";
import { MAHASISWA_PER_MATKUL } from "../../data/dosenData";
import { MINGGU_BERJALAN_DEFAULT } from "../../config/presensiConfig";

// Komponen Kartu Mata Kuliah yang Diampu Dosen
export default function KartuMatkul({ course, isHero = false }) {
  const navigate = useNavigate();
  const { isSesiBuka, toggleSesiPresensi, getPresensiKelasPertemuan } = useAttendance();

  // Status apakah sesi presensi saat ini dibuka oleh dosen
  const sesiAktif = isSesiBuka(course.id);
  const totalMhs = (MAHASISWA_PER_MATKUL[course.id] || []).length;

  // Ambil ringkasan kehadiran pertemuan berjalan (Minggu ke-8)
  const presensiHariIni = getPresensiKelasPertemuan(course.id, MINGGU_BERJALAN_DEFAULT);
  const ringkasan = presensiHariIni.ringkasan;

  const handleCardClick = () => {
    navigate(`/dosen/matkul/${course.id}`);
  };

  const handleToggleSesi = (e) => {
    e.stopPropagation(); // Cegah pindah halaman saat klik toggle
    toggleSesiPresensi(course.id);
  };

  // Varian Hero untuk "Kuliah Hari Ini" di bagian atas Beranda Dosen
  if (isHero) {
    return (
      <div className="dosen-hero-card" onClick={handleCardClick} role="button" tabIndex={0}>
        <div className="dosen-hero-header">
          <div className="dosen-badge-live">
            <span className="live-pulse-dot" />
            <span>KULIAH HARI INI</span>
          </div>
          <span className="dosen-hero-time">{course.waktu}</span>
        </div>

        <h3 className="dosen-hero-title">{course.nama}</h3>
        <p className="dosen-hero-subtitle">
          {course.kode} • {course.sks} SKS • Ruang {course.ruangan}
        </p>

        {/* Ringkasan Live Presensi */}
        <div className="dosen-hero-metrics">
          <div className="hero-metric-item metric-hadir">
            <span className="hero-metric-val">{ringkasan.hadir}</span>
            <span className="hero-metric-lbl">Hadir</span>
          </div>
          <div className="hero-metric-item metric-terlambat">
            <span className="hero-metric-val">{ringkasan.terlambat}</span>
            <span className="hero-metric-lbl">Terlambat</span>
          </div>
          <div className="hero-metric-item metric-belum">
            <span className="hero-metric-val">{ringkasan.belum}</span>
            <span className="hero-metric-lbl">Belum</span>
          </div>
          <div className="hero-metric-item metric-total">
            <span className="hero-metric-val">{ringkasan.persen}%</span>
            <span className="hero-metric-lbl">Kehadiran</span>
          </div>
        </div>

        {/* Tombol Kontrol Cepat: Sesi Presensi & Buka Detail */}
        <div className="dosen-hero-footer">
          <button
            type="button"
            className={`btn-sesi-toggle ${sesiAktif ? "sesi-buka" : "sesi-tutup"}`}
            onClick={handleToggleSesi}
            title={sesiAktif ? "Klik untuk menutup sesi presensi" : "Klik untuk membuka sesi presensi"}
          >
            <span className="sesi-indicator" />
            <span>{sesiAktif ? "Sesi Presensi Terbuka" : "Sesi Presensi Ditutup"}</span>
          </button>

          <span className="dosen-hero-link">
            Kelola Presensi
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </span>
        </div>
      </div>
    );
  }

  // Tampilan Kartu Biasa untuk Daftar "Mata Kuliah yang Diampu"
  return (
    <div className="dosen-matkul-card" onClick={handleCardClick} role="button" tabIndex={0}>
      <div className="dosen-matkul-top">
        <span className="dosen-matkul-kode">{course.kode}</span>
        <span className="dosen-matkul-sks">{course.sks} SKS</span>
      </div>

      <h4 className="dosen-matkul-nama">{course.nama}</h4>

      <div className="dosen-matkul-meta">
        <div className="dosen-meta-row">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>
            {course.hari}, {course.waktu}
          </span>
        </div>
        <div className="dosen-meta-row">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{course.ruangan}</span>
        </div>
        <div className="dosen-meta-row">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>{totalMhs} Mahasiswa</span>
        </div>
      </div>

      <div className="dosen-matkul-bottom">
        <span
          className={`sesi-status-chip ${sesiAktif ? "chip-open" : "chip-closed"}`}
          onClick={handleToggleSesi}
        >
          {sesiAktif ? "● Sesi Dibuka" : "○ Sesi Ditutup"}
        </span>

        <span className="dosen-view-detail-btn">
          Lihat Rekap
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </span>
      </div>
    </div>
  );
}
