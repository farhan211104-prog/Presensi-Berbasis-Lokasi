import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import BottomNavDosen from "../../components/dosen/BottomNavDosen";
import TabelPresensi from "../../components/dosen/TabelPresensi";
import MatriksRekap from "../../components/dosen/MatriksRekap";
import StatistikKelas from "../../components/dosen/StatistikKelas";
import { useAttendance } from "../../context/AttendanceContext";
import { MINGGU_BERJALAN_DEFAULT } from "../../config/presensiConfig";
import { MAHASISWA_PER_MATKUL } from "../../data/dosenData";

// Halaman Detail Mata Kuliah Dosen (Tab: Presensi Hari Ini, Rekap Minggu 1-15, Statistik)
export default function DetailMatkul() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { matkulDosen, isSesiBuka, toggleSesiPresensi } = useAttendance();

  // Cari data mata kuliah
  const course = matkulDosen.find((m) => m.id === courseId) || matkulDosen[0];

  // State tab aktif ("presensi", "rekap", "statistik")
  const [activeTab, setActiveTab] = useState("presensi");

  // State pertemuan yang dipilih (default minggu ke-8 / minggu berjalan)
  const [pertemuanKe, setPertemuanKe] = useState(MINGGU_BERJALAN_DEFAULT);

  // Status buka/tutup sesi presensi
  const sesiAktif = isSesiBuka(course.id);
  const totalMhs = (MAHASISWA_PER_MATKUL[course.id] || []).length;

  return (
    <div className="mobile-page-wrapper">
      {/* Header dengan tombol kembali ke Beranda Dosen */}
      <Header variant="subpage" title="Kelola Mata Kuliah" />

      <main className="subpage-content">
        {/* 1. Header Informasi Mata Kuliah & Toggle Sesi */}
        <div className="detail-matkul-header-card">
          <div className="matkul-header-top-row">
            <span className="matkul-badge-kode">{course.kode}</span>
            <span className="matkul-badge-sks">{course.sks} SKS</span>
          </div>

          <h2 className="matkul-title-large">{course.nama}</h2>

          <div className="matkul-meta-badges">
            <span className="meta-badge-item">
              📅 {course.hari}, {course.waktu}
            </span>
            <span className="meta-badge-item">
              📍 Ruang {course.ruangan}
            </span>
            <span className="meta-badge-item">
              👥 {totalMhs} Mahasiswa
            </span>
          </div>

          {/* Saklar Kontrol Sesi Presensi */}
          <div className="sesi-control-bar">
            <div className="sesi-info-text">
              <span className={`sesi-status-dot ${sesiAktif ? "dot-open" : "dot-closed"}`} />
              <div>
                <strong className="sesi-text-title">
                  {sesiAktif ? "Sesi Presensi Terbuka" : "Sesi Presensi Ditutup"}
                </strong>
                <p className="sesi-text-sub">
                  {sesiAktif
                    ? "Mahasiswa diizinkan melakukan presensi mandiri."
                    : "Mahasiswa tidak dapat melakukan presensi saat sesi ditutup."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleSesiPresensi(course.id)}
              className={`btn-toggle-sesi-switch ${sesiAktif ? "btn-switch-on" : "btn-switch-off"}`}
              title={sesiAktif ? "Tutup sesi presensi" : "Buka sesi presensi"}
            >
              {sesiAktif ? "Tutup Sesi" : "Buka Sesi"}
            </button>
          </div>
        </div>

        {/* 2. Navigasi 3 Tab Segmen */}
        <div className="tabs-segment-wrapper">
          <button
            type="button"
            className={`tab-segment-btn ${activeTab === "presensi" ? "active" : ""}`}
            onClick={() => setActiveTab("presensi")}
          >
            <span className="tab-icon">📋</span>
            <span>Presensi Hari Ini</span>
          </button>

          <button
            type="button"
            className={`tab-segment-btn ${activeTab === "rekap" ? "active" : ""}`}
            onClick={() => setActiveTab("rekap")}
          >
            <span className="tab-icon">📊</span>
            <span>Rekap Minggu 1-15</span>
          </button>

          <button
            type="button"
            className={`tab-segment-btn ${activeTab === "statistik" ? "active" : ""}`}
            onClick={() => setActiveTab("statistik")}
          >
            <span className="tab-icon">📈</span>
            <span>Statistik</span>
          </button>
        </div>

        {/* 3. Konten Sesuai Tab Terpilih */}
        <div className="tab-content-area">
          {activeTab === "presensi" && (
            <TabelPresensi
              course={course}
              pertemuanKe={pertemuanKe}
              setPertemuanKe={setPertemuanKe}
            />
          )}

          {activeTab === "rekap" && (
            <MatriksRekap course={course} />
          )}

          {activeTab === "statistik" && (
            <StatistikKelas course={course} />
          )}
        </div>
      </main>

      {/* Navigasi Bawah Khusus Dosen */}
      <BottomNavDosen />
    </div>
  );
}
