import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import FeatureButton from "../components/FeatureButton";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

export default function Beranda() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State jadwal kuliah hari ini dari server
  const [jadwalToday, setJadwalToday] = useState([]);
  const [loadingJadwal, setLoadingJadwal] = useState(true);

  // State status pendaftaran biometrik wajah
  const [wajahStatus, setWajahStatus] = useState(null);
  const [loadingWajah, setLoadingWajah] = useState(true);

  // Ambil jadwal kuliah hari ini dan status wajah dari server
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoadingJadwal(true);
        const res = await api.get("/jadwal/hari-ini");
        if (isMounted) {
          setJadwalToday(res.jadwal || res.data || []);
        }
      } catch (err) {
        console.error("Gagal mengambil jadwal kuliah hari ini dari server:", err);
      } finally {
        if (isMounted) {
          setLoadingJadwal(false);
        }
      }

      try {
        setLoadingWajah(true);
        const statusRes = await api.get("/wajah/status");
        if (isMounted) {
          setWajahStatus(statusRes);
        }
      } catch (err) {
        console.warn("Gagal mengambil status pendaftaran wajah:", err);
      } finally {
        if (isMounted) {
          setLoadingWajah(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Ambil mata kuliah utama hari ini jika ada
  const kuliahUtama = jadwalToday.length > 0 ? jadwalToday[0] : null;
  const sudahPresensi = Boolean(kuliahUtama?.presensi?.status);

  // Format jam presensi jika sudah melakukan presensi
  const getJamPresensiFormatted = (presensi) => {
    if (!presensi?.waktuPresensi) return "";
    const wp = presensi.waktuPresensi;
    const timeStr = wp.includes("T") ? wp.split("T")[1]?.slice(0, 5) : wp.slice(11, 16);
    if (presensi.status === "terlambat") {
      return `Terlambat ${presensi.selisihMenitTerlambat || ""}m (${timeStr})`;
    }
    return `Hadir pukul ${timeStr}`;
  };

  return (
    <div className="mobile-page-wrapper">
      {/* 1. Header Merah Tel-U dengan identitas pengguna login */}
      <Header variant="main" />

      {/* Konten Utama */}
      <main className="beranda-content">
        {/* 2. Kartu Jadwal Kuliah Hari Ini dari Server */}
        <section className="today-schedule-card">
          <div className="schedule-header-row">
            <div className="badge-today">
              <span className="dot-live" />
              <span>Hari Ini</span>
            </div>

            {/* Status Presensi Terkini */}
            {loadingJadwal ? (
              <span className="status-badge-pending">Memuat...</span>
            ) : kuliahUtama ? (
              sudahPresensi ? (
                <span className="status-badge-attended">
                  ✓ {getJamPresensiFormatted(kuliahUtama.presensi)}
                </span>
              ) : (
                <span className="status-badge-pending">Belum Presensi</span>
              )
            ) : (
              <span className="status-badge-pending">Libur</span>
            )}
          </div>

          {loadingJadwal ? (
            <div style={{ padding: "16px 0", color: "#64748B", fontSize: "0.85rem" }}>
              Memeriksa jadwal kuliah hari ini...
            </div>
          ) : kuliahUtama ? (
            <>
              {/* Judul Mata Kuliah */}
              <h3 className="course-card-title">
                {kuliahUtama.kode} - {kuliahUtama.nama}
              </h3>

              <p className="course-card-subtitle">
                Dosen: {kuliahUtama.dosen?.nama || "Dosen Pengampu"}
              </p>

              {/* Tiga Kolom: Waktu, Ruangan, Kode Dosen */}
              <div className="schedule-three-columns">
                <div className="schedule-col">
                  <div className="col-icon">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#E8313A"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div className="col-info">
                    <span className="col-label">Waktu</span>
                    <span className="col-value">
                      {kuliahUtama.jamMulai} - {kuliahUtama.jamSelesai}
                    </span>
                  </div>
                </div>

                <div className="schedule-col">
                  <div className="col-icon">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#E8313A"
                      strokeWidth="2"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div className="col-info">
                    <span className="col-label">Ruangan</span>
                    <span className="col-value">{kuliahUtama.ruangan || "-"}</span>
                  </div>
                </div>

                <div className="schedule-col">
                  <div className="col-icon">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#E8313A"
                      strokeWidth="2"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="col-info">
                    <span className="col-label">Kode Dosen</span>
                    <span className="col-value">
                      {kuliahUtama.dosen?.kode || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tombol aksi cepat ke halaman presensi */}
              <button
                onClick={() => {
                  if (!sudahPresensi && wajahStatus && !wajahStatus.sudahDaftar) {
                    navigate("/daftar-wajah");
                  } else {
                    navigate("/presensi");
                  }
                }}
                className={`btn-schedule-action ${
                  sudahPresensi ? "btn-attended" : ""
                }`}
              >
                {sudahPresensi ? (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Lihat Status Presensi</span>
                  </>
                ) : (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 14 14" />
                    </svg>
                    <span>Presensi Kuliah Sekarang</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Tampilan jika tidak ada kuliah hari ini */}
              <h3 className="course-card-title">Tidak ada kuliah hari ini</h3>
              <p className="course-card-subtitle" style={{ marginBottom: 16 }}>
                Tidak ada jadwal perkuliahan hari ini. Anda dapat memeriksa riwayat kehadiran atau melihat hasil studi.
              </p>
              <button
                onClick={() => navigate("/rekap")}
                className="btn-schedule-action"
                style={{ background: "#475569" }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                <span>Lihat Rekap Kehadiran</span>
              </button>
            </>
          )}
        </section>

        {/* 2b. Kartu Status Verifikasi Wajah Biometrik (Tahap 4) */}
        <section
          className="face-status-card"
          onClick={() => navigate("/daftar-wajah")}
          style={{
            background: "#FFFFFF",
            borderRadius: 18,
            padding: "16px 18px",
            marginBottom: 20,
            border: wajahStatus?.sudahDaftar
              ? "1px solid #A7F3D0"
              : "1px solid #FDE68A",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            transition: "transform 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: wajahStatus?.sudahDaftar ? "#ECFDF5" : "#FFFBEB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.25rem",
                flexShrink: 0,
              }}
            >
              {loadingWajah ? "⏳" : wajahStatus?.sudahDaftar ? "🛡️" : "📸"}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontSize: "0.86rem",
                    fontWeight: 700,
                    color: "var(--text-main)",
                  }}
                >
                  Verifikasi Wajah Biometrik
                </span>
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 10,
                    background: wajahStatus?.sudahDaftar ? "#ECFDF5" : "#FEF3C7",
                    color: wajahStatus?.sudahDaftar ? "#059669" : "#D97706",
                  }}
                >
                  {loadingWajah
                    ? "Memeriksa..."
                    : wajahStatus?.sudahDaftar
                    ? "Terdaftar"
                    : "Wajib Daftar"}
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.76rem",
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                {loadingWajah
                  ? "Memuat status biometrik..."
                  : wajahStatus?.sudahDaftar
                  ? `${wajahStatus.jumlahSample || 3} sampel wajah aktif. Ketuk untuk kelola data.`
                  : "Daftarkan 3 sudut foto wajah Anda untuk presensi."}
              </p>
            </div>
          </div>
          <span style={{ fontSize: "1rem", color: "var(--text-subtle)" }}>→</span>
        </section>

        {/* 3. Section Fitur Aplikasi (HANYA 3 TOMBOL) */}
        <section className="features-section">
          <div className="features-section-header">
            <h4 className="section-title">Fitur Aplikasi</h4>
            <span className="section-subtitle">Akses Cepat Akademik</span>
          </div>

          <div className="features-grid">
            {/* a) Presensi Mahasiswa */}
            <FeatureButton
              to="/presensi"
              label="Presensi Mahasiswa"
              badge={kuliahUtama && !sudahPresensi ? "Ada Jadwal" : null}
              icon={
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#E8313A"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                  <path d="M9 14l2 2 4-4" />
                </svg>
              }
            />

            {/* b) Nilai Mahasiswa */}
            <FeatureButton
              to="/nilai"
              label="Nilai Mahasiswa"
              icon={
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#E8313A"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="6" />
                  <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
                </svg>
              }
            />

            {/* c) Rekap Kehadiran */}
            <FeatureButton
              to="/rekap"
              label="Rekap Kehadiran"
              icon={
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#E8313A"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                  <line x1="2" y1="20" x2="22" y2="20" />
                </svg>
              }
            />
          </div>
        </section>

        {/* Informasi Bantuan Akademik Singkat */}
        <section className="academic-info-banner">
          <div className="info-banner-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0284C7"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <div className="info-banner-text">
            <h5>Ketentuan Presensi Tel-U</h5>
            <p>
              Batas toleransi keterlambatan adalah 15 menit dari jam mulai
              kuliah. Kehadiran minimal 75% untuk mengikuti UAS.
            </p>
          </div>
        </section>
      </main>

      {/* 4. Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
}
