import { useState, useEffect, useCallback } from "react";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import api from "../api/client";

export default function Nilai() {
  // State daftar semester dari server
  const [semesterList, setSemesterList] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");

  // State data nilai semester terpilih dari server
  const [nilaiData, setNilaiData] = useState(null);
  const [loadingSemester, setLoadingSemester] = useState(true);
  const [loadingNilai, setLoadingNilai] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 1. Ambil daftar periode semester dari server
  const fetchSemesters = useCallback(async () => {
    try {
      setLoadingSemester(true);
      setErrorMessage("");
      const res = await api.get("/nilai/semester");
      const list = res.semester || res.data || [];
      setSemesterList(list);

      if (list.length > 0) {
        setSelectedSemester(list[0]);
      }
    } catch (err) {
      console.error("Gagal memuat daftar semester:", err);
      setErrorMessage(err.message || "Gagal memuat daftar semester");
    } finally {
      setLoadingSemester(false);
    }
  }, []);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  // 2. Ambil data nilai, IPS, dan IPK untuk semester terpilih dari server
  const fetchNilai = useCallback(async (semesterName) => {
    if (!semesterName) return;
    try {
      setLoadingNilai(true);
      setErrorMessage("");
      const res = await api.get(`/nilai?semester=${encodeURIComponent(semesterName)}`);
      setNilaiData(res);
    } catch (err) {
      console.error("Gagal memuat rincian nilai:", err);
      setErrorMessage(err.message || "Gagal memuat rincian nilai semester");
      setNilaiData(null);
    } finally {
      setLoadingNilai(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSemester) {
      fetchNilai(selectedSemester);
    }
  }, [selectedSemester, fetchNilai]);

  const mataKuliahList = nilaiData?.mataKuliah || [];
  const ips = nilaiData?.ips !== undefined ? Number(nilaiData.ips).toFixed(2) : "0.00";
  const ipk = nilaiData?.ipk !== undefined ? Number(nilaiData.ipk).toFixed(2) : "0.00";
  const totalSksSemester = nilaiData?.totalSks ?? 0;

  // Helper kelas warna badge indeks nilai
  const getBadgeColorClass = (indeks) => {
    switch (indeks) {
      case "A":
        return "badge-grade-a";
      case "AB":
        return "badge-grade-ab";
      case "B":
        return "badge-grade-b";
      case "BC":
        return "badge-grade-bc";
      case "C":
        return "badge-grade-c";
      case "D":
        return "badge-grade-d";
      default:
        return "badge-grade-e";
    }
  };

  return (
    <div className="mobile-page-wrapper">
      {/* Header dengan tombol kembali ke Beranda */}
      <Header variant="subpage" title="Nilai Mahasiswa" />

      <main className="subpage-content">
        {/* Banner Pesan Error jika terjadi kegagalan request */}
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
              onClick={() => (selectedSemester ? fetchNilai(selectedSemester) : fetchSemesters())}
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

        {/* Dropdown Pilihan Semester */}
        <div className="semester-select-card">
          <label htmlFor="semester-dropdown" className="semester-label">
            Pilih Periode Semester
          </label>
          <div className="select-wrapper">
            <select
              id="semester-dropdown"
              className="semester-dropdown"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              disabled={loadingSemester || semesterList.length === 0}
            >
              {loadingSemester ? (
                <option value="">Memuat periode semester...</option>
              ) : semesterList.length === 0 ? (
                <option value="">Tidak ada data semester</option>
              ) : (
                semesterList.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
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
        </div>

        {/* State Loading Nilai */}
        {loadingNilai && (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              background: "#FFF",
              borderRadius: 16,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              color: "#64748B",
              fontSize: "0.85rem",
              marginBottom: 16,
            }}
          >
            Memuat hasil studi dari server...
          </div>
        )}

        {/* Konten Nilai dari Server */}
        {!loadingNilai && nilaiData && (
          <>
            {/* Ringkasan IPK & IPS (Dihitung Otomatis di Server) */}
            <div className="gpa-summary-grid">
              {/* Kartu IPS Semester Terpilih */}
              <div className="gpa-card gpa-card-ips">
                <div className="gpa-card-header">
                  <span className="gpa-title">IPS Semester</span>
                  <span className="gpa-sub">{totalSksSemester} SKS</span>
                </div>
                <div className="gpa-value-row">
                  <span className="gpa-score">{ips}</span>
                  <span className="gpa-scale">/ 4.00</span>
                </div>
                <p className="gpa-desc">Indeks Prestasi Semester ini</p>
              </div>

              {/* Kartu IPK Kumulatif Lintas Semester */}
              <div className="gpa-card gpa-card-ipk">
                <div className="gpa-card-header">
                  <span className="gpa-title">IPK Kumulatif</span>
                  <span className="gpa-badge-honor">
                    {Number(ipk) >= 3.5 ? "Dengan Pujian" : Number(ipk) >= 3.0 ? "Sangat Memuaskan" : "Memuaskan"}
                  </span>
                </div>
                <div className="gpa-value-row">
                  <span className="gpa-score">{ipk}</span>
                  <span className="gpa-scale">/ 4.00</span>
                </div>
                <p className="gpa-desc">Akumulasi seluruh semester</p>
              </div>
            </div>

            {/* Daftar Mata Kuliah & Nilai */}
            <div className="nilai-table-section">
              <div className="section-header-row">
                <h4 className="section-title">Hasil Studi</h4>
                <span className="count-badge">
                  {mataKuliahList.length} Mata Kuliah
                </span>
              </div>

              {mataKuliahList.length === 0 ? (
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    background: "#FFF",
                    borderRadius: 14,
                    color: "#94A3B8",
                    fontSize: "0.85rem",
                  }}
                >
                  Belum ada nilai yang diinputkan untuk semester ini.
                </div>
              ) : (
                <>
                  {/* Tabel Nilai (Bisa discroll horizontal pada layar kecil) */}
                  <div className="table-scroll-container">
                    <table className="nilai-table">
                      <thead>
                        <tr>
                          <th style={{ width: "35%" }}>Mata Kuliah</th>
                          <th className="text-center">SKS</th>
                          <th className="text-center">Tugas</th>
                          <th className="text-center">UTS</th>
                          <th className="text-center">UAS</th>
                          <th className="text-center">Akhir</th>
                          <th className="text-center">Indeks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mataKuliahList.map((mk) => {
                          const gradeLetter = mk.indeksHuruf || mk.indeks || "E";
                          return (
                            <tr key={mk.kode}>
                              <td>
                                <div className="td-course-info">
                                  <span className="td-course-name">{mk.nama}</span>
                                  <span className="td-course-code">{mk.kode}</span>
                                </div>
                              </td>
                              <td className="text-center">{mk.sks}</td>
                              <td className="text-center">{mk.tugas}</td>
                              <td className="text-center">{mk.uts}</td>
                              <td className="text-center">{mk.uas}</td>
                              <td className="text-center font-bold">{mk.nilaiAkhir}</td>
                              <td className="text-center">
                                <span className={`grade-badge ${getBadgeColorClass(gradeLetter)}`}>
                                  {gradeLetter}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="table-hint">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    <span>Geser ke samping untuk melihat seluruh komponen nilai</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </>
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
