import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import CameraModal from "../components/CameraModal";
import SecureImage from "../components/SecureImage";
import api from "../api/client";
import { LOKASI_PRESENSI, RADIUS_METER } from "../config/lokasi";

// ============================================================================
// HALAMAN PRESENSI MAHASISWA BERBASIS LOKASI DI SERVER (TAHAP 2)
// Seluruh perhitungan jarak, waktu, dan penentuan status dilakukan di server.
// Frontend hanya mengirim { jadwalId, lat, lng, accuracy }.
// ============================================================================

/**
 * Jembatan sementara untuk memperbarui data localStorage agar halaman
 * Dosen yang masih memakai localStorage tidak rusak.
 * TODO: Dihapus di Tahap 5 saat halaman dosen memakai API
 */
function updateLocalStorageBridge(courseCode, serverPresensi, lokasiData) {
  try {
    const statusCap = serverPresensi.status === "hadir" ? "Hadir" : "Terlambat";
    const jamMenit = serverPresensi.waktuPresensi
      ? serverPresensi.waktuPresensi.split("T")[1]?.slice(0, 5) || ""
      : "";
    const keteranganJam =
      serverPresensi.selisihMenit > 0
        ? `Terlambat ${serverPresensi.selisihMenit} menit pukul ${jamMenit}`
        : `Hadir pukul ${jamMenit}`;

    // Perbarui telu_presensi_hari_ini untuk halaman dosen
    const existingPresensi = JSON.parse(
      localStorage.getItem("telu_presensi_hari_ini") || "{}"
    );
    existingPresensi[courseCode] = {
      sudahPresensi: true,
      jam: keteranganJam,
      jamRaw: jamMenit,
      status: statusCap,
      statusLabel: statusCap,
      selisihMenit: serverPresensi.selisihMenit || 0,
      tanggal: new Date(serverPresensi.waktuPresensi).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      lat: lokasiData.lat,
      lng: lokasiData.lng,
      jarak: serverPresensi.jarakMeter,
      metode: serverPresensi.metode || "face-recognition-simulasi",
    };
    localStorage.setItem(
      "telu_presensi_hari_ini",
      JSON.stringify(existingPresensi)
    );
  } catch (err) {
    console.warn("Gagal memperbarui jembatan localStorage dosen:", err);
  }
}

export default function Presensi() {
  const navigate = useNavigate();

  // -------------------------------------------------------------------------
  // STATE DATA DARI SERVER
  // -------------------------------------------------------------------------
  const [jadwalList, setJadwalList] = useState([]);
  const [waktuServer, setWaktuServer] = useState(null);
  const [loadingJadwal, setLoadingJadwal] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // State toast notifikasi feedback
  const [toastMessage, setToastMessage] = useState("");

  // State proses pemeriksaan lokasi GPS
  const [locationChecking, setLocationChecking] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [outOfRadiusData, setOutOfRadiusData] = useState(null);

  // State informasi status lokasi pengguna saat ini (berdasarkan kalkulasi server)
  const [locationStatus, setLocationStatus] = useState({
    checked: false,
    lat: null,
    lng: null,
    distance: null,
    accuracy: null,
    inRadius: false,
    lokasiNama: LOKASI_PRESENSI.nama,
  });

  // State modal kamera
  const [activeCourseForCamera, setActiveCourseForCamera] = useState(null);

  // =========================================================================
  // STATE MODE DEVELOPER (HANYA AKTIF SAAT import.meta.env.DEV)
  // =========================================================================
  const [useSimulatedLocation, setUseSimulatedLocation] = useState(false);
  const [simLat, setSimLat] = useState(String(LOKASI_PRESENSI.lat));
  const [simLng, setSimLng] = useState(String(LOKASI_PRESENSI.lng));
  const [devCopyFeedback, setDevCopyFeedback] = useState("");

  // Simulasi waktu server & flag biometrik
  const [simWaktuInput, setSimWaktuInput] = useState("2026-10-12T14:35");
  const [activeSimWaktu, setActiveSimWaktu] = useState(null);
  const [simWaktuLoading, setSimWaktuLoading] = useState(false);
  const [wajibDaftarWajahServer, setWajibDaftarWajahServer] = useState(true);

  /**
   * Mengambil data jadwal kuliah hari ini dari server: GET /api/jadwal/hari-ini
   */
  const fetchJadwal = useCallback(async () => {
    try {
      setLoadingJadwal(true);
      setFetchError(null);
      const res = await api.get("/jadwal/hari-ini");
      const list = res.jadwal || res.data || [];
      setJadwalList(list);
      setWaktuServer(res.waktuServer || null);
    } catch (err) {
      console.error("Gagal memuat jadwal hari ini dari server:", err);
      setFetchError(err.message || "Gagal menghubungi server backend.");
    } finally {
      setLoadingJadwal(false);
    }
  }, []);

  /**
   * Mengambil status waktu simulasi dev dan config flag dari server: GET /api/dev/waktu & /api/dev/config
   */
  const fetchDevConfig = useCallback(async () => {
    if (!import.meta.env.DEV) return;
    try {
      const resWaktu = await api.get("/dev/waktu");
      setActiveSimWaktu(resWaktu.waktuSimulasi || null);
    } catch (err) {
      console.warn("Gagal membaca waktu simulasi dev:", err);
    }

    try {
      const resConfig = await api.get("/dev/config");
      setWajibDaftarWajahServer(Boolean(resConfig.wajibDaftarWajah));
    } catch (err) {
      console.warn("Gagal membaca config dev:", err);
    }
  }, []);

  useEffect(() => {
    fetchJadwal();
    fetchDevConfig();
  }, [fetchJadwal, fetchDevConfig]);

  /**
   * Helper untuk mendapatkan koordinat GPS perangkat atau koordinat simulasi dev
   */
  const dapatkanKoordinat = () => {
    return new Promise((resolve, reject) => {
      if (import.meta.env.DEV && useSimulatedLocation) {
        const parsedLat = parseFloat(simLat);
        const parsedLng = parseFloat(simLng);
        if (isNaN(parsedLat) || isNaN(parsedLng)) {
          return reject(
            new Error(
              "Koordinat simulasi tidak valid. Periksa input Lat dan Lng."
            )
          );
        }
        return resolve({
          latitude: parsedLat,
          longitude: parsedLng,
          accuracy: 8, // simulasi akurasi baik (8 meter)
        });
      }

      if (!navigator.geolocation) {
        return reject(
          new Error("Browser Anda tidak mendukung fitur Geolocation GPS.")
        );
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
          });
        },
        (err) => {
          switch (err.code) {
            case err.PERMISSION_DENIED:
              reject(
                new Error(
                  "Izin akses lokasi ditolak oleh browser. Silakan aktifkan izin lokasi di pengaturan browser Anda."
                )
              );
              break;
            case err.POSITION_UNAVAILABLE:
              reject(
                new Error(
                  "Informasi lokasi GPS tidak tersedia. Pastikan GPS perangkat Anda aktif dan memiliki sinyal."
                )
              );
              break;
            case err.TIMEOUT:
              reject(
                new Error(
                  "Permintaan lokasi waktu habis (timeout 10 detik). Silakan coba lagi."
                )
              );
              break;
            default:
              reject(
                new Error(
                  `Kendala GPS: ${err.message || "Gagal mendapatkan lokasi."}`
                )
              );
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  /**
   * Handler saat tombol "Presensi" / "Presensi Ulang" pada mata kuliah diklik.
   * Alur: Ambil GPS -> POST /api/presensi/cek-lokasi -> jika dalam area buka CameraModal.
   */
  const handleStartPresensi = async (course) => {
    setLocationError(null);
    setOutOfRadiusData(null);
    setLocationChecking(true);

    try {
      // 1. Ambil koordinat GPS
      const coords = await dapatkanKoordinat();

      // 2. Kirim ke server untuk pengecekan lokasi (server adalah satu-satunya penentu)
      const cekResult = await api.post("/presensi/cek-lokasi", {
        jadwalId: course.jadwalId,
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy,
      });

      // 3. Update status lokasi dari kalkulasi server
      setLocationStatus({
        checked: true,
        lat: coords.latitude,
        lng: coords.longitude,
        distance: cekResult.jarakMeter,
        accuracy: cekResult.akurasiMeter,
        inRadius: cekResult.dalamArea,
        lokasiNama: cekResult.lokasi?.nama || LOKASI_PRESENSI.nama,
      });

      // 4. Validasi keputusan server: Apakah pengguna di dalam area presensi?
      if (!cekResult.dalamArea) {
        // DI LUAR AREA: JANGAN BUKA KAMERA! Tampilkan kotak peringatan merah
        setOutOfRadiusData({
          jarak: cekResult.jarakMeter,
          maxRadius: cekResult.radiusMeter,
          lokasiNama: cekResult.lokasi?.nama || LOKASI_PRESENSI.nama,
          course,
        });
        return;
      }

      // DALAM AREA: Buka modal kamera untuk verifikasi wajah
      setActiveCourseForCamera(course);
    } catch (err) {
      console.error("Kesalahan proses cek lokasi presensi:", err);
      const errMsg =
        err.data?.message || err.message || "Gagal memeriksa lokasi presensi.";
      setLocationError(errMsg);
    } finally {
      setLocationChecking(false);
    }
  };

  /**
   * Callback saat verifikasi wajah di CameraModal berhasil.
   * Menerima Blob foto wajah dan mengirim multipart/form-data ke POST /api/presensi.
   */
  const handleFaceSuccess = async (fotoBlob) => {
    if (!activeCourseForCamera) return;

    try {
      // Bentuk multipart/form-data (jangan set Content-Type manual agar browser menyertakan boundary)
      const formData = new FormData();
      formData.append("jadwalId", activeCourseForCamera.jadwalId);
      formData.append("lat", locationStatus.lat);
      formData.append("lng", locationStatus.lng);
      formData.append("accuracy", locationStatus.accuracy);
      if (fotoBlob) {
        formData.append("foto", fotoBlob, "presensi.jpg");
      }

      // Kirim data presensi ke server
      const res = await api.post("/presensi", formData);

      // Tutup kamera di semua jalur
      setActiveCourseForCamera(null);

      // Tampilkan notifikasi sukses
      const statusLabel =
        res.presensi?.status === "hadir" ? "HADIR" : "TERLAMBAT";
      setToastMessage(
        `Presensi berhasil! Wajah terverifikasi dan lokasi valid (Status: ${statusLabel}, Jarak: ${res.presensi?.jarakMeter ?? 0}m).`
      );

      // Jembatan sementara untuk halaman rekap & dosen
      updateLocalStorageBridge(
        activeCourseForCamera.kode,
        res.presensi,
        locationStatus
      );

      // Muat ulang jadwal dari server agar status tombol dan badge terupdate
      await fetchJadwal();

      setTimeout(() => {
        setToastMessage("");
      }, 4000);
    } catch (err) {
      console.error("Presensi gagal di server:", err);
      // Kamera tetap dimatikan di semua jalur, termasuk saat gagal
      setActiveCourseForCamera(null);

      const errorData = err.data || {};
      const errorCode = errorData.code;
      const errorMsg =
        errorData.message || err.message || "Gagal melakukan presensi.";

      if (errorCode === "WAJAH_BELUM_DAFTAR") {
        setLocationError(
          "Anda belum mendaftarkan sampel wajah. Mengarahkan ke halaman Pendaftaran Wajah..."
        );
        setTimeout(() => {
          navigate("/daftar-wajah");
        }, 1800);
      } else if (errorCode === "WAJAH_TIDAK_COCOK") {
        setLocationError(
          "Verifikasi wajah gagal. Wajah Anda tidak cocok dengan sampel terdaftar. Silakan posisikan wajah dengan jelas dan ulangi."
        );
      } else if (errorCode === "FILE_TIDAK_VALID") {
        setLocationError(
          "Foto presensi tidak valid atau format tidak didukung (hanya JPEG/PNG)."
        );
      } else if (errorCode === "FILE_TERLALU_BESAR") {
        setLocationError("Ukuran foto presensi melebihi batas maksimal 2MB.");
      } else if (errorCode === "DI_LUAR_AREA") {
        setOutOfRadiusData({
          jarak: errorData.jarakMeter ?? locationStatus.distance,
          maxRadius: errorData.radiusMeter ?? RADIUS_METER,
          lokasiNama: errorData.lokasiNama || LOKASI_PRESENSI.nama,
          course: activeCourseForCamera,
        });
      } else {
        setLocationError(errorMsg);
      }
    }
  };

  // =========================================================================
  // HANDLER MODE DEVELOPER (SIMULASI WAKTU, SALIN KOORDINAT, RESET PRESENSI)
  // =========================================================================
  const handleCopyCurrentCoordinates = () => {
    if (!navigator.geolocation) {
      setDevCopyFeedback("Geolocation tidak didukung.");
      return;
    }

    setDevCopyFeedback("Mendeteksi koordinat GPS...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const cLat = pos.coords.latitude;
        const cLng = pos.coords.longitude;
        setSimLat(String(cLat));
        setSimLng(String(cLng));

        if (navigator.clipboard) {
          navigator.clipboard
            .writeText(`lat: ${cLat}, lng: ${cLng}`)
            .catch(() => {});
        }

        setDevCopyFeedback(
          `Disalin: Lat ${cLat.toFixed(5)}, Lng ${cLng.toFixed(5)}`
        );
        setTimeout(() => setDevCopyFeedback(""), 4000);
      },
      (err) => {
        setDevCopyFeedback(`Gagal membaca GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  /**
   * Reset seluruh rekaman presensi hari ini di server: DELETE /api/dev/presensi/hari-ini
   */
  const handleResetPresensi = async () => {
    const konfirmasi = window.confirm(
      "Apakah Anda yakin ingin mereset semua data presensi hari ini di database server? Status akan dikembalikan ke kondisi belum presensi."
    );
    if (!konfirmasi) return;

    try {
      const res = await api.delete("/dev/presensi/hari-ini");

      // Bersihkan juga jembatan lokal
      // TODO: Dihapus di Tahap 5 saat halaman dosen memakai API
      localStorage.removeItem("telu_presensi_hari_ini");

      setLocationStatus({
        checked: false,
        lat: null,
        lng: null,
        distance: null,
        accuracy: null,
        inRadius: false,
        lokasiNama: LOKASI_PRESENSI.nama,
      });
      setOutOfRadiusData(null);
      setLocationError(null);
      setToastMessage(res.message || "Data presensi hari ini berhasil direset!");

      // Muat ulang jadwal dari server
      await fetchJadwal();

      setTimeout(() => setToastMessage(""), 3500);
    } catch (err) {
      alert("Gagal mereset presensi: " + (err.message || "Terjadi kesalahan"));
    }
  };

  /**
   * Terapkan waktu simulasi server: POST /api/dev/waktu
   */
  const handleApplySimWaktu = async (isoWaktuStr) => {
    try {
      setSimWaktuLoading(true);
      const res = await api.post("/dev/waktu", { waktu: isoWaktuStr });
      setActiveSimWaktu(res.waktuSimulasi || null);
      await fetchJadwal();
      setToastMessage(
        isoWaktuStr
          ? `Waktu server diubah ke: ${res.waktuSimulasi}`
          : "Waktu server dinonaktifkan (kembali ke waktu sistem nyata)"
      );
      setTimeout(() => setToastMessage(""), 3500);
    } catch (err) {
      alert("Gagal menyetel waktu simulasi: " + err.message);
    } finally {
      setSimWaktuLoading(false);
    }
  };

  // Format tanggal display dari waktu server
  const tanggalDisplay = waktuServer
    ? new Date(waktuServer).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Senin, 12 Oktober 2026";

  return (
    <div className="mobile-page-wrapper">
      {/* Header dengan tombol kembali ke Beranda */}
      <Header variant="subpage" title="Presensi Mahasiswa" />

      <main className="subpage-content">
        {/* Banner Info Hari & Tanggal (berdasarkan waktu server) */}
        <div className="presensi-date-card">
          <div className="date-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#E8313A"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <span className="date-badge-label">Jadwal Hari Ini</span>
            <h4 className="date-title">{tanggalDisplay}</h4>
            <p className="date-desc">
              Presensi berbasis Geofencing Radius ({RADIUS_METER}m) & Face
              Verification.
            </p>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* PANEL STATUS GEOLOKASI PRESENSI                                    */}
        {/* ------------------------------------------------------------------ */}
        <div className="location-status-card">
          <div className="loc-card-header">
            <div className="loc-header-title">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#E8313A"
                strokeWidth="2.2"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>Status Lokasi Presensi</span>
            </div>

            {locationStatus.checked && (
              <span
                className={`loc-badge-tag ${
                  locationStatus.inRadius ? "loc-tag-inside" : "loc-tag-outside"
                }`}
              >
                {locationStatus.inRadius ? "● Dalam Area" : "● Di Luar Area"}
              </span>
            )}
          </div>

          <p className="loc-target-name">
            <strong>Target:</strong> {locationStatus.lokasiNama} (Maks.{" "}
            {RADIUS_METER}m)
          </p>

          <div className="loc-metrics-grid">
            <div className="loc-metric-item">
              <span className="loc-metric-label">Jarak Saat Ini</span>
              <span
                className={`loc-metric-val ${
                  locationStatus.checked
                    ? locationStatus.inRadius
                      ? "text-success"
                      : "text-danger"
                    : ""
                }`}
              >
                {locationStatus.checked
                  ? `${locationStatus.distance} m`
                  : "Belum dicek"}
              </span>
            </div>

            <div className="loc-metric-item">
              <span className="loc-metric-label">Akurasi GPS</span>
              <span className="loc-metric-val">
                {locationStatus.checked ? `± ${locationStatus.accuracy} m` : "-"}
              </span>
            </div>
          </div>

          {/* Peringatan jika akurasi GPS lebih buruk dari radius yang ditentukan */}
          {locationStatus.checked && locationStatus.accuracy > RADIUS_METER && (
            <div className="gps-accuracy-warning">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#D97706"
                strokeWidth="2"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>
                Peringatan: Akurasi GPS Anda kurang baik (±
                {locationStatus.accuracy}m &gt; {RADIUS_METER}m). Disarankan
                berada di luar ruangan untuk sinyal GPS yang lebih presisi.
              </span>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* PESAN ERROR LOKASI / SERVER                                        */}
        {/* ------------------------------------------------------------------ */}
        {locationError && (
          <div className="danger-warning-banner" role="alert">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#DC2626"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <strong>Kendala Presensi</strong>
              <p>{locationError}</p>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PESAN MERAH JIKA DI LUAR AREA PRESENSI (JARAK > RADIUS_METER)     */}
        {/* Kamera TIDAK boleh terbuka!                                       */}
        {/* ------------------------------------------------------------------ */}
        {outOfRadiusData && (
          <div className="out-of-radius-box" role="alert">
            <div className="out-of-radius-top">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#DC2626"
                strokeWidth="2.2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              <h5 className="out-of-radius-title">Di Luar Jangkauan Presensi</h5>
            </div>

            <p className="out-of-radius-desc">
              Anda berada di luar area presensi (jarak{" "}
              <strong>{outOfRadiusData.jarak} m</strong>, maksimal{" "}
              <strong>{outOfRadiusData.maxRadius} m</strong>) dari{" "}
              <strong>{outOfRadiusData.lokasiNama}</strong>.
            </p>

            <button
              type="button"
              onClick={() => handleStartPresensi(outOfRadiusData.course)}
              className="btn-retry-location"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M23 4v6h-6" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              <span>Coba Lagi</span>
            </button>
          </div>
        )}

        {/* Notifikasi Toast Sukses */}
        {toastMessage && (
          <div className="success-toast" role="status">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PANEL MODE DEVELOPER (HANYA AKTIF SAAT import.meta.env.DEV)        */}
        {/* ------------------------------------------------------------------ */}
        {import.meta.env.DEV && (
          <div className="developer-mode-panel">
            <div className="dev-panel-header">
              <span className="dev-panel-tag">MODE DEVELOPER</span>
              <span className="dev-panel-sub">Simulasi Pengujian Tugas Akhir</span>
            </div>

            <p className="dev-panel-desc">
              Gunakan panel ini untuk menguji kondisi <strong>Di Dalam Radius</strong>,{" "}
              <strong>Di Luar Radius</strong>, serta simulasi waktu untuk status{" "}
              <strong>Hadir vs Terlambat</strong>.
            </p>

            {/* Aksi Cepat: Salin GPS, Reset Presensi & Hapus Data Wajah */}
            <div className="dev-actions-row">
              <button
                type="button"
                onClick={handleCopyCurrentCoordinates}
                className="btn-dev-action"
              >
                📍 Salin GPS
              </button>
              <button
                type="button"
                onClick={handleResetPresensi}
                className="btn-dev-reset"
              >
                🔄 Reset Presensi
              </button>
              <button
                type="button"
                onClick={async () => {
                  const konfirmasi = window.confirm("Hapus seluruh sampel data wajah Anda dari server?");
                  if (!konfirmasi) return;
                  try {
                    await api.delete("/wajah");
                    setToastMessage("Data biometrik wajah Anda berhasil dihapus dari server.");
                    setTimeout(() => setToastMessage(""), 3500);
                  } catch (err) {
                    alert("Gagal menghapus data wajah: " + err.message);
                  }
                }}
                className="btn-dev-action"
                style={{ color: "#DC2626", borderColor: "#FCA5A5" }}
              >
                🗑️ Hapus Wajah
              </button>
              {devCopyFeedback && (
                <span className="dev-copy-status">{devCopyFeedback}</span>
              )}
            </div>

            {/* Status Flag WAJIB_DAFTAR_WAJAH dari Server (Read-Only) */}
            <div
              className="dev-toggle-row"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: "1px dashed var(--border-light)",
              }}
            >
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-main)" }}>
                Status Flag <code>WAJIB_DAFTAR_WAJAH</code>:
              </span>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 12,
                  background: wajibDaftarWajahServer ? "#ECFDF5" : "#FEF2F2",
                  color: wajibDaftarWajahServer ? "#059669" : "#DC2626",
                }}
              >
                {wajibDaftarWajahServer ? "AKTIF (Wajib Daftar)" : "NONAKTIF (Opsional)"}
              </span>
            </div>

            {/* 1. KONTROL SIMULASI LOKASI */}
            <div className="dev-toggle-row">
              <label className="dev-checkbox-label">
                <input
                  type="checkbox"
                  checked={useSimulatedLocation}
                  onChange={(e) => setUseSimulatedLocation(e.target.checked)}
                />
                <span>Aktifkan Lokasi Tiruan (Simulasi)</span>
              </label>
            </div>

            {useSimulatedLocation && (
              <div className="dev-coords-inputs">
                <div className="dev-input-group">
                  <label>Lat:</label>
                  <input
                    type="text"
                    value={simLat}
                    onChange={(e) => setSimLat(e.target.value)}
                    placeholder="-6.9856"
                  />
                </div>
                <div className="dev-input-group">
                  <label>Lng:</label>
                  <input
                    type="text"
                    value={simLng}
                    onChange={(e) => setSimLng(e.target.value)}
                    placeholder="107.6331"
                  />
                </div>

                {/* Preset Koordinat Cepat */}
                <div className="dev-presets-row">
                  <button
                    type="button"
                    className="btn-preset-chip"
                    onClick={() => {
                      setSimLat(String(LOKASI_PRESENSI.lat));
                      setSimLng(String(LOKASI_PRESENSI.lng));
                    }}
                  >
                    ✓ Preset Dalam Radius (~0m)
                  </button>
                  <button
                    type="button"
                    className="btn-preset-chip danger"
                    onClick={() => {
                      setSimLat(String(-6.988));
                      setSimLng(String(107.635));
                    }}
                  >
                    ✕ Preset Luar Radius (~340m)
                  </button>
                </div>
              </div>
            )}

            {/* 2. KONTROL SIMULASI WAKTU SERVER */}
            <div className="dev-toggle-row">
              <span
                style={{
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                }}
              >
                ⏱️ Simulasi Waktu Server:
              </span>
              {activeSimWaktu ? (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: "0.72rem",
                    color: "#D97706",
                    fontWeight: 700,
                  }}
                >
                  Aktif ({activeSimWaktu})
                </span>
              ) : (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: "0.72rem",
                    color: "#64748B",
                  }}
                >
                  Nonaktif (Waktu Nyata)
                </span>
              )}
            </div>

            <div className="dev-coords-inputs">
              <div className="dev-input-group">
                <label style={{ width: "50px" }}>Waktu:</label>
                <input
                  type="datetime-local"
                  value={simWaktuInput}
                  onChange={(e) => setSimWaktuInput(e.target.value)}
                  style={{
                    flex: 1,
                    fontSize: "0.78rem",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                  }}
                />
              </div>

              <div className="dev-actions-row">
                <button
                  type="button"
                  disabled={simWaktuLoading}
                  onClick={() => {
                    if (simWaktuInput) {
                      handleApplySimWaktu(`${simWaktuInput}:00+07:00`);
                    }
                  }}
                  className="btn-dev-action"
                  style={{ backgroundColor: "#EFF6FF", borderColor: "#93C5FD" }}
                >
                  Set Waktu Server
                </button>
                <button
                  type="button"
                  disabled={simWaktuLoading || !activeSimWaktu}
                  onClick={() => handleApplySimWaktu(null)}
                  className="btn-dev-action"
                  style={{ color: "#64748B" }}
                >
                  Matikan Simulasi (Reset Realtime)
                </button>
              </div>

              {/* Preset Cepat Pengujian Skenario Hadir vs Terlambat */}
              <div className="dev-presets-row">
                <button
                  type="button"
                  className="btn-preset-chip"
                  onClick={() => {
                    setSimWaktuInput("2026-10-12T14:35");
                    handleApplySimWaktu("2026-10-12T14:35:00+07:00");
                  }}
                >
                  ✓ Hadir (Senin 14:35)
                </button>
                <button
                  type="button"
                  className="btn-preset-chip danger"
                  onClick={() => {
                    setSimWaktuInput("2026-10-12T14:48");
                    handleApplySimWaktu("2026-10-12T14:48:00+07:00");
                  }}
                >
                  ⚠️ Terlambat (Senin 14:48, +18m)
                </button>
                <button
                  type="button"
                  className="btn-preset-chip danger"
                  onClick={() => {
                    setSimWaktuInput("2026-10-12T17:00");
                    handleApplySimWaktu("2026-10-12T17:00:00+07:00");
                  }}
                >
                  ✕ Lewat Jam (Senin 17:00)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* DAFTAR MATA KULIAH HARI INI DARI SERVER                            */}
        {/* ------------------------------------------------------------------ */}
        <div className="presensi-section-header">
          <h4 className="section-title">Mata Kuliah Terjadwal</h4>
          <span className="count-badge">
            {jadwalList.length} Perkuliahan
          </span>
        </div>

        {/* State Loading Jadwal */}
        {loadingJadwal ? (
          <div
            className="empty-state-card"
            style={{ padding: "32px 16px", gap: "12px" }}
          >
            <div className="spinner-border-sm" style={{ width: 32, height: 32 }} />
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Memuat jadwal kuliah dari server...
            </p>
          </div>
        ) : fetchError ? (
          /* State Error Fetch Jadwal */
          <div className="danger-warning-banner" role="alert">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#DC2626"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div style={{ flex: 1 }}>
              <strong>Gagal Memuat Jadwal</strong>
              <p>{fetchError}</p>
              <button
                type="button"
                onClick={fetchJadwal}
                className="btn-retry-location"
                style={{ marginTop: 8 }}
              >
                Coba Lagi
              </button>
            </div>
          </div>
        ) : jadwalList.length === 0 ? (
          /* State Kosong */
          <div className="empty-state-card">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <h4>Tidak ada kuliah hari ini</h4>
            <p>Anda tidak memiliki jadwal perkuliahan yang aktif hari ini.</p>
          </div>
        ) : (
          /* Daftar Kartu Jadwal */
          <div className="course-presensi-list">
            {jadwalList.map((kuliah) => {
              const presensi = kuliah.presensi;
              const sudahHadir = Boolean(presensi);
              const statusIsHadir = presensi?.status === "hadir";

              // Label jam presensi
              const jamPresensiFormatted = presensi?.waktuPresensi
                ? presensi.waktuPresensi.split("T")[1]?.slice(0, 5)
                : "";

              const labelKeteranganPresensi = sudahHadir
                ? statusIsHadir
                  ? `Hadir pukul ${jamPresensiFormatted}`
                  : `Terlambat ${presensi?.selisihMenitTerlambat ?? 0} menit pukul ${jamPresensiFormatted}`
                : "";

              return (
                <div
                  key={kuliah.jadwalId}
                  className={`course-presensi-card ${
                    sudahHadir ? "attended-card" : ""
                  }`}
                >
                  <div className="course-card-top">
                    <span className="course-code-badge">{kuliah.kode}</span>
                    <span className="course-sks-badge">{kuliah.sks} SKS</span>
                  </div>

                  <h3 className="course-presensi-name">{kuliah.nama}</h3>

                  <div className="course-meta-grid">
                    <div className="meta-item">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#64748B"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>
                        {kuliah.jamMulai} - {kuliah.jamSelesai}
                      </span>
                    </div>

                    <div className="meta-item">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#64748B"
                        strokeWidth="2"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span>{kuliah.ruangan || "-"}</span>
                    </div>

                    <div className="meta-item full-width">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#64748B"
                        strokeWidth="2"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <span>
                        Dosen: {kuliah.dosen?.nama} ({kuliah.dosen?.kode})
                      </span>
                    </div>
                  </div>

                  {/* Tombol Presensi / Label Status */}
                  <div className="presensi-action-area">
                    {sudahHadir ? (
                      <div className="status-sudah-presensi-box">
                        <div className="status-sudah-presensi" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {/* Foto Presensi Kecil Berotorisasi */}
                          {presensi.fotoUrl ? (
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 8,
                                overflow: "hidden",
                                flexShrink: 0,
                                border: "1px solid var(--border-card)",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                              }}
                            >
                              <SecureImage
                                src={presensi.fotoUrl}
                                alt="Foto presensi"
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            </div>
                          ) : (
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke={statusIsHadir ? "#059669" : "#D97706"}
                              strokeWidth="2.5"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                          <div className="status-sudah-info">
                            <span
                              className="status-label-bold"
                              style={{
                                color: statusIsHadir ? "#059669" : "#D97706",
                              }}
                            >
                              {statusIsHadir ? "Hadir" : "Terlambat"}
                            </span>
                            <span className="status-jam-keterangan">
                              {labelKeteranganPresensi}{" "}
                              {presensi.jarakMeter !== null &&
                              presensi.jarakMeter !== undefined
                                ? `• ${presensi.jarakMeter}m`
                                : ""}
                            </span>
                          </div>
                        </div>

                        {/* Tombol Presensi Ulang (Mode Demo / Development) */}
                        {import.meta.env.DEV && (
                          <button
                            type="button"
                            onClick={() => handleStartPresensi(kuliah)}
                            disabled={locationChecking}
                            className="btn-presensi-ulang"
                          >
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                            >
                              <path d="M23 4v6h-6" />
                              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                            </svg>
                            <span>Presensi Ulang (Demo)</span>
                          </button>
                        )}
                      </div>
                    ) : !kuliah.bolehPresensi ? (
                      <div className="sesi-ditutup-card">
                        <div className="sesi-ditutup-badge">
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#64748B"
                            strokeWidth="2.2"
                          >
                            <rect
                              x="3"
                              y="11"
                              width="18"
                              height="11"
                              rx="2"
                              ry="2"
                            />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          <span>Presensi Tidak Tersedia</span>
                        </div>
                        <p className="sesi-ditutup-pesan">
                          {kuliah.alasan || "Presensi belum dibuka"}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartPresensi(kuliah)}
                        disabled={locationChecking}
                        className="btn-lakukan-presensi"
                      >
                        {locationChecking ? (
                          <>
                            <div className="spinner-border-sm" />
                            <span>Mengecek Lokasi GPS ke Server...</span>
                          </>
                        ) : (
                          <>
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span>Presensi (Lokasi & Wajah)</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Petunjuk Tambahan */}
        <div className="presensi-note-card">
          <p>
            ℹ️ <strong>Alur Presensi TA:</strong> Sistem memverifikasi lokasi
            geofencing maksimal {RADIUS_METER} meter dari{" "}
            {locationStatus.lokasiNama || LOKASI_PRESENSI.nama} di sisi server,
            dilanjutkan verifikasi wajah melalui kamera perangkat.
          </p>
        </div>
      </main>

      {/* Modal Kamera (Simulasi Face Recognition) */}
      <CameraModal
        isOpen={Boolean(activeCourseForCamera)}
        courseName={activeCourseForCamera?.nama}
        onClose={() => setActiveCourseForCamera(null)}
        onSuccess={handleFaceSuccess}
      />

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}
