import { useMemo, useState } from "react";
import { useAttendance } from "../../context/AttendanceContext";
import ModalUbahStatus from "./ModalUbahStatus";
import { MINGGU_BERJALAN_DEFAULT } from "../../config/presensiConfig";

// Komponen Statistik Kelas (Tab 3 pada Detail Matkul Dosen)
export default function StatistikKelas({ course }) {
  const { getPresensiKelasPertemuan, getMatriksRekapKelas, ubahStatusManualDosen } = useAttendance();

  // State modal untuk ubah status cepat jika dosen ingin membenahi status
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMhs, setSelectedMhs] = useState(null);

  // Ambil data matriks presensi
  const matriksData = getMatriksRekapKelas(course.id);
  const listMahasiswa = Object.values(matriksData);

  // 1. Hitung persentase kehadiran per minggu (1 s/d 15) untuk grafik batang
  const dataGrafikMingguan = useMemo(() => {
    const arr = [];
    for (let m = 1; m <= 15; m++) {
      const dataP = getPresensiKelasPertemuan(course.id, m);
      const isPastOrCurrent = m <= MINGGU_BERJALAN_DEFAULT;
      arr.push({
        minggu: m,
        persen: isPastOrCurrent ? dataP.ringkasan.persen : 0,
        isPastOrCurrent,
        isToday: m === MINGGU_BERJALAN_DEFAULT,
        hadir: dataP.ringkasan.hadir,
        terlambat: dataP.ringkasan.terlambat,
        alpha: dataP.ringkasan.alpha,
      });
    }
    return arr;
  }, [course.id, getPresensiKelasPertemuan]);

  // 2. Hitung Rata-Rata Kehadiran Kelas (dari minggu yang sudah berjalan 1..8)
  const statsKeseluruhan = useMemo(() => {
    if (listMahasiswa.length === 0) return { rataRata: 0, totalMhs: 0 };

    const totalPersen = listMahasiswa.reduce((acc, curr) => acc + curr.stats.persen, 0);
    const rataRata = Math.round(totalPersen / listMahasiswa.length);

    return {
      rataRata,
      totalMhs: listMahasiswa.length,
    };
  }, [listMahasiswa]);

  // 3. Daftar "Mahasiswa Berisiko" (< 75%)
  const mahasiswaBerisiko = useMemo(() => {
    return listMahasiswa
      .filter((item) => item.stats.berisiko)
      .sort((a, b) => a.stats.persen - b.stats.persen);
  }, [listMahasiswa]);

  // 4. Daftar "Sering Terlambat" (terlambat >= 1, urut dari yang paling sering)
  const mahasiswaSeringTerlambat = useMemo(() => {
    return listMahasiswa
      .filter((item) => item.stats.terlambat > 0)
      .sort((a, b) => b.stats.terlambat - a.stats.terlambat);
  }, [listMahasiswa]);

  const handleOpenModal = (mhs) => {
    setSelectedMhs(mhs);
    setModalOpen(true);
  };

  const handleSaveModal = (newStatus, catatan) => {
    if (!selectedMhs) return;
    ubahStatusManualDosen(
      course.id,
      MINGGU_BERJALAN_DEFAULT,
      selectedMhs.nim,
      newStatus,
      catatan
    );
  };

  return (
    <div className="statistik-kelas-container">
      {/* 1. Ringkasan Kartu Angka Utama */}
      <div className="stats-overview-grid">
        <div className="stats-metric-card metric-primary">
          <span className="stats-metric-title">Rata-rata Kehadiran Kelas</span>
          <div className="stats-metric-val-row">
            <span className="stats-metric-number">{statsKeseluruhan.rataRata}%</span>
            <span
              className={`stats-health-pill ${
                statsKeseluruhan.rataRata >= 75 ? "health-good" : "health-danger"
              }`}
            >
              {statsKeseluruhan.rataRata >= 75 ? "Kondisi Baik" : "Perlu Perhatian"}
            </span>
          </div>
          <p className="stats-metric-desc">
            Dihitung dari Minggu ke-1 hingga Minggu ke-{MINGGU_BERJALAN_DEFAULT} (Pertemuan Berjalan)
          </p>
        </div>

        <div className="stats-metric-card metric-risk">
          <span className="stats-metric-title">Mahasiswa Berisiko (&lt;75%)</span>
          <span className="stats-metric-number text-danger">
            {mahasiswaBerisiko.length}
          </span>
          <p className="stats-metric-desc">
            Beresiko tidak memenuhi syarat mengikuti Ujian Akhir Semester
          </p>
        </div>

        <div className="stats-metric-card metric-late">
          <span className="stats-metric-title">Pernah Terlambat</span>
          <span className="stats-metric-number text-warning">
            {mahasiswaSeringTerlambat.length}
          </span>
          <p className="stats-metric-desc">
            Total mahasiswa yang tercatat hadir melewati batas toleransi 15 menit
          </p>
        </div>
      </div>

      {/* 2. Grafik Batang Sederhana (Pure CSS & SVG Inline, Responsif) */}
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h4 className="chart-title">Tren Tingkat Kehadiran per Minggu</h4>
            <p className="chart-subtitle">Minggu 1 s/d 15 (Target minimal 75%)</p>
          </div>
          <span className="chart-legend-target">── Garis Batas 75%</span>
        </div>

        <div className="chart-bars-wrapper">
          {/* Garis ambang batas 75% */}
          <div className="chart-threshold-line" style={{ bottom: "75%" }}>
            <span className="threshold-label">75%</span>
          </div>

          {/* Kolom-kolom batang minggu 1-15 */}
          <div className="chart-bars-track">
            {dataGrafikMingguan.map((bar) => {
              const heightPercent = bar.isPastOrCurrent ? bar.persen : 0;
              const isBelowThreshold = bar.isPastOrCurrent && bar.persen < 75;

              return (
                <div key={bar.minggu} className="chart-bar-col">
                  {/* Tooltip nilai persentase di atas batang */}
                  <span className="bar-val-text">
                    {bar.isPastOrCurrent ? `${bar.persen}%` : "-"}
                  </span>

                  <div className="bar-track">
                    <div
                      className={`bar-fill ${
                        bar.isToday
                          ? "fill-today"
                          : isBelowThreshold
                          ? "fill-danger"
                          : bar.isPastOrCurrent
                          ? "fill-success"
                          : "fill-future"
                      }`}
                      style={{ height: `${heightPercent}%` }}
                      title={`Minggu ${bar.minggu}: ${bar.persen}% (Hadir: ${bar.hadir}, Terlambat: ${bar.terlambat}, Alpha: ${bar.alpha})`}
                    />
                  </div>

                  <span className={`bar-label ${bar.isToday ? "label-today-bold" : ""}`}>
                    M{bar.minggu}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Dua Bagian: Mahasiswa Berisiko & Mahasiswa Sering Terlambat */}
      <div className="risk-tables-grid">
        {/* Kolom Kiri: Mahasiswa Berisiko (< 75%) */}
        <div className="risk-card card-berisiko">
          <div className="risk-card-header">
            <div className="risk-header-title-row">
              <span className="icon-warning-pill">⚠️</span>
              <h5 className="risk-section-title">Mahasiswa Berisiko (&lt;75%)</h5>
            </div>
            <span className="badge-count-risk">{mahasiswaBerisiko.length} Orang</span>
          </div>

          {mahasiswaBerisiko.length === 0 ? (
            <div className="empty-risk-state">
              <span className="empty-check-icon">✓</span>
              <p>Hebat! Tidak ada mahasiswa dengan kehadiran di bawah 75%.</p>
            </div>
          ) : (
            <div className="risk-items-list">
              {mahasiswaBerisiko.map(({ mhs, stats }) => (
                <div key={mhs.nim} className="risk-item-row">
                  <div className="risk-item-left">
                    <span className="risk-mhs-nama">{mhs.nama}</span>
                    <span className="risk-mhs-nim">NIM: {mhs.nim}</span>
                    <span className="risk-mhs-breakdown">
                      H: {stats.hadir} • T: {stats.terlambat} • A: {stats.alpha}
                    </span>
                  </div>
                  <div className="risk-item-right">
                    <span className="badge-danger-percent">{stats.persen}%</span>
                    <button
                      type="button"
                      onClick={() => handleOpenModal(mhs)}
                      className="btn-quick-override"
                      title="Ubah status manual untuk mahasiswa ini"
                    >
                      Ubah Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kolom Kanan: Sering Terlambat */}
        <div className="risk-card card-terlambat">
          <div className="risk-card-header">
            <div className="risk-header-title-row">
              <span className="icon-warning-pill late-icon">🕒</span>
              <h5 className="risk-section-title">Sering Terlambat</h5>
            </div>
            <span className="badge-count-late">{mahasiswaSeringTerlambat.length} Orang</span>
          </div>

          {mahasiswaSeringTerlambat.length === 0 ? (
            <div className="empty-risk-state">
              <span className="empty-check-icon">✓</span>
              <p>Tidak ada catatan keterlambatan untuk kelas ini.</p>
            </div>
          ) : (
            <div className="risk-items-list">
              {mahasiswaSeringTerlambat.map(({ mhs, stats }) => (
                <div key={mhs.nim} className="risk-item-row">
                  <div className="risk-item-left">
                    <span className="risk-mhs-nama">{mhs.nama}</span>
                    <span className="risk-mhs-nim">NIM: {mhs.nim}</span>
                    <span className="risk-mhs-breakdown">
                      Total Kehadiran: {stats.persen}%
                    </span>
                  </div>
                  <div className="risk-item-right">
                    <span className="badge-late-count">
                      {stats.terlambat}x Terlambat
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenModal(mhs)}
                      className="btn-quick-override"
                      title="Ubah status manual untuk mahasiswa ini"
                    >
                      Ubah Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Ubah Status Manual */}
      {selectedMhs && (
        <ModalUbahStatus
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedMhs(null);
          }}
          mahasiswa={selectedMhs}
          pertemuanKe={MINGGU_BERJALAN_DEFAULT}
          statusSaatIni={matriksData[selectedMhs.nim]?.riwayat[MINGGU_BERJALAN_DEFAULT]?.status}
          catatanSaatIni={matriksData[selectedMhs.nim]?.riwayat[MINGGU_BERJALAN_DEFAULT]?.catatan}
          onSave={handleSaveModal}
        />
      )}
    </div>
  );
}
