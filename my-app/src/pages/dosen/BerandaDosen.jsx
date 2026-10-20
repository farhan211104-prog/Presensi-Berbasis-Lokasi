import { useState } from "react";
import Header from "../../components/Header";
import BottomNavDosen from "../../components/dosen/BottomNavDosen";
import KartuMatkul from "../../components/dosen/KartuMatkul";
import { useAttendance } from "../../context/AttendanceContext";
import { setWaktuSimulasi, resetWaktuSimulasi, getWaktuSekarang, formatJamMenit } from "../../utils/waktu";

// Halaman Beranda Dosen
export default function BerandaDosen() {
  const { matkulDosen, resetSemuaDataDosen, simulasiWaktuState, setSimulasiWaktuState } = useAttendance();

  // Matkul hari ini (AZK4BAA2) dan matkul lainnya
  const matkulHariIni = matkulDosen.find((m) => m.isHariIni) || matkulDosen[0];
  const matkulLainnya = matkulDosen.filter((m) => m.id !== matkulHariIni.id);

  // State form simulasi waktu (Mode Developer)
  const [jamSimulasiInput, setJamSimulasiInput] = useState(
    simulasiWaktuState?.jam || "14:35"
  );
  const [devFeedback, setDevFeedback] = useState("");

  // Handler simpan simulasi jam
  const handleTerapkanSimulasi = (e) => {
    e.preventDefault();
    setWaktuSimulasi(jamSimulasiInput);
    setSimulasiWaktuState({
      aktif: true,
      jam: jamSimulasiInput,
    });
    setDevFeedback(`Waktu simulasi aktif: ${jamSimulasiInput}`);
    setTimeout(() => setDevFeedback(""), 4000);
  };

  // Handler reset ke waktu nyata
  const handleKembalikanWaktuNyata = () => {
    resetWaktuSimulasi();
    setSimulasiWaktuState({
      aktif: false,
      jam: "14:30",
    });
    setDevFeedback("Kembali ke waktu jam nyata.");
    setTimeout(() => setDevFeedback(""), 4000);
  };

  // Handler reset data presensi
  const handleResetData = () => {
    const konfirmasi = window.confirm(
      "Apakah Anda yakin ingin mereset seluruh data presensi mahasiswa dan pengubahan manual dosen ke kondisi awal dummy?"
    );
    if (konfirmasi) {
      resetSemuaDataDosen();
      setDevFeedback("Data presensi berhasil direset!");
      setTimeout(() => setDevFeedback(""), 4000);
    }
  };

  // Waktu saat ini (nyata atau simulasi)
  const waktuAktif = getWaktuSekarang();
  const jamAktifStr = formatJamMenit(waktuAktif);

  return (
    <div className="mobile-page-wrapper">
      {/* Header Merah Tel-U Dosen */}
      <Header variant="main" />

      <main className="beranda-content">
        {/* 1. Bagian Kuliah Hari Ini (Hero Card) */}
        <section className="section-block">
          <div className="section-header-compact">
            <h3 className="section-title-dosen">Jadwal Mengajar Hari Ini</h3>
            <span className="live-clock-pill">
              🕒 {jamAktifStr} {simulasiWaktuState.aktif && "(Simulasi)"}
            </span>
          </div>

          <KartuMatkul course={matkulHariIni} isHero={true} />
        </section>

        {/* 2. Bagian Semua Mata Kuliah yang Diampu */}
        <section className="section-block">
          <div className="section-header-compact">
            <h3 className="section-title-dosen">Mata Kuliah yang Diampu</h3>
            <span className="count-badge">{matkulDosen.length} Mata Kuliah</span>
          </div>

          <div className="dosen-matkul-grid">
            {matkulDosen.map((course) => (
              <KartuMatkul key={course.id} course={course} isHero={false} />
            ))}
          </div>
        </section>

        {/* 3. Panel Mode Developer (Pengujian Waktu & Reset Presensi) */}
        {import.meta.env.DEV && (
          <section className="section-block">
            <div className="developer-mode-panel">
              <div className="dev-panel-header">
                <span className="dev-panel-tag">MODE DEVELOPER DOSEN</span>
                <span className="dev-panel-sub">Simulasi Waktu & Presensi</span>
              </div>

              <p className="dev-panel-desc">
                Ubah jam sistem untuk menguji apakah presensi mahasiswa tercatat sebagai{" "}
                <strong>Hadir</strong> (toleransi $\le$ 15 menit dari 14:30) atau{" "}
                <strong>Terlambat</strong> (&gt; 14:45).
              </p>

              {/* Status Waktu Simulasi */}
              <div className="dev-status-time-row">
                <span>Jam Terbaca Sistem: <strong>{jamAktifStr}</strong></span>
                {simulasiWaktuState.aktif ? (
                  <span className="pill-sim-active">● Mode Simulasi Aktif</span>
                ) : (
                  <span className="pill-sim-inactive">○ Jam Nyata Perangkat</span>
                )}
              </div>

              {/* Form Input Jam */}
              <form onSubmit={handleTerapkanSimulasi} className="dev-time-form">
                <label className="dev-time-label">Atur Jam Simulasi (HH:mm):</label>
                <div className="dev-time-input-group">
                  <input
                    type="time"
                    className="dev-time-input"
                    value={jamSimulasiInput}
                    onChange={(e) => setJamSimulasiInput(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn-set-time">
                    Terapkan Jam
                  </button>
                  {simulasiWaktuState.aktif && (
                    <button
                      type="button"
                      onClick={handleKembalikanWaktuNyata}
                      className="btn-reset-time"
                    >
                      Batal Simulasi
                    </button>
                  )}
                </div>
              </form>

              {/* Preset Tombol Cepat Uji Skenario */}
              <div className="dev-presets-time-row">
                <button
                  type="button"
                  className="btn-time-preset"
                  onClick={() => {
                    setJamSimulasiInput("14:35");
                    setWaktuSimulasi("14:35");
                    setSimulasiWaktuState({ aktif: true, jam: "14:35" });
                    setDevFeedback("Jam diatur ke 14:35 (Status Hadir, tepat waktu)");
                  }}
                >
                  ⚡ Preset: 14:35 (Hadir)
                </button>
                <button
                  type="button"
                  className="btn-time-preset"
                  onClick={() => {
                    setJamSimulasiInput("14:55");
                    setWaktuSimulasi("14:55");
                    setSimulasiWaktuState({ aktif: true, jam: "14:55" });
                    setDevFeedback("Jam diatur ke 14:55 (Terlambat 25 menit)");
                  }}
                >
                  ⚡ Preset: 14:55 (Terlambat)
                </button>
                <button
                  type="button"
                  className="btn-time-preset"
                  onClick={() => {
                    setJamSimulasiInput("17:00");
                    setWaktuSimulasi("17:00");
                    setSimulasiWaktuState({ aktif: true, jam: "17:00" });
                    setDevFeedback("Jam diatur ke 17:00 (Selesai Kuliah)");
                  }}
                >
                  ⚡ Preset: 17:00 (Selesai Kuliah)
                </button>
              </div>

              {/* Tombol Reset Data Presensi */}
              <div className="dev-actions-divider">
                <button
                  type="button"
                  onClick={handleResetData}
                  className="btn-dev-reset-all"
                >
                  🔄 Reset Seluruh Data Presensi ke Kondisi Dummy
                </button>
              </div>

              {devFeedback && (
                <div className="dev-feedback-toast">
                  <span>ℹ️ {devFeedback}</span>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Navigasi Bawah Khusus Dosen */}
      <BottomNavDosen />
    </div>
  );
}
