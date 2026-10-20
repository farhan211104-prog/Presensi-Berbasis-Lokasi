import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import SecureImage from "../components/SecureImage";
import api from "../api/client";
import { captureVideoFrameToBlob } from "../components/CameraModal";

// 3 Instruksi posisi foto wajah sesuai spesifikasi
const PANDUAN_FOTO = [
  {
    step: 1,
    title: "Foto 1 dari 3: Hadap Lurus",
    instruction: "Posisikan wajah Anda tegak dan lurus tepat menghadap ke kamera.",
    icon: "👤",
  },
  {
    step: 2,
    title: "Foto 2 dari 3: Sedikit ke Kiri",
    instruction: "Palingkan wajah Anda sedikit ke arah kiri (~15 derajat).",
    icon: "👈",
  },
  {
    step: 3,
    title: "Foto 3 dari 3: Sedikit ke Kanan",
    instruction: "Palingkan wajah Anda sedikit ke arah kanan (~15 derajat).",
    icon: "👉",
  },
];

export default function DaftarWajah() {
  const navigate = useNavigate();

  // State data dari server
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [statusData, setStatusData] = useState({
    sudahDaftar: false,
    jumlahSample: 0,
    targetSample: 3,
    disetujui: true,
    daftarSample: [],
  });

  // State persetujuan biometrik
  const [setujuChecked, setSetujuChecked] = useState(true);
  const [submittingPersetujuan, setSubmittingPersetujuan] = useState(false);

  // State alur pendaftaran 3 foto - Default true agar kamera langsung aktif saat halaman dibuka
  const [isRegistering, setIsRegistering] = useState(true);
  const [currentStep, setCurrentStep] = useState(1); // 1, 2, 3
  const [capturedSamples, setCapturedSamples] = useState([]); // [{ step, blob, previewUrl }]
  const [submittingSamples, setSubmittingSamples] = useState(false);

  // State kamera WebRTC
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("inactive"); // "inactive" | "starting" | "active" | "error"
  const [cameraError, setCameraError] = useState(null);

  // State feedback toast / error
  const [errorMessage, setErrorMessage] = useState("");
  const [successToast, setSuccessToast] = useState("");

  // Ref untuk pembersihan URL preview foto
  const previewUrlsRef = useRef([]);

  /**
   * Mengambil status pendaftaran wajah saat ini dari server di latar belakang
   */
  const fetchStatus = async () => {
    try {
      const res = await api.get("/wajah/status");
      setStatusData(res);
      if (res.disetujui !== undefined) {
        setSetujuChecked(Boolean(res.disetujui));
      }
    } catch (err) {
      console.error("Gagal memuat status wajah:", err.name || "FetchStatusError");
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  /**
   * Menghentikan stream kamera WebRTC agar lampu indikator kamera mati
   */
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.onended = null; // Lepas listener agar tidak memicu error palsu
          track.stop();
        } catch (e) {
          console.error("Gagal stop track kamera:", e.name || "TrackStopError");
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraStatus("inactive");
  };

  /**
   * Menyalakan kamera depan untuk sesi pendaftaran
   * Aman terhadap React StrictMode menggunakan pengecekan flag pembatalan
   */
  const mulaiKamera = async (isCancelled) => {
    // Hentikan stream yang mungkin masih berjalan sebelumnya
    stopCamera();
    setCameraLoading(true);
    setCameraStatus("starting");
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("Akses kamera gagal: NotFoundError");
      setCameraError("Perangkat atau browser Anda tidak mendukung akses kamera.");
      setCameraLoading(false);
      setCameraStatus("error");
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      // Jika effect sudah dibatalkan saat getUserMedia sedang berjalan (React StrictMode dev)
      if (isCancelled && isCancelled()) {
        mediaStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {}
        });
        return;
      }

      streamRef.current = mediaStream;

      // Listener jika stream kamera terputus secara tak terduga
      mediaStream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          if (streamRef.current === mediaStream) {
            console.error("Kamera track ended");
            setCameraError("Kamera terputus atau dinonaktifkan oleh sistem.");
            setCameraStatus("error");
          }
        };
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        try {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
          setCameraStatus("active");
        } catch (playErr) {
          // Tangani AbortError tanpa membuat kamera mati (Requirement 3)
          if (playErr.name === "AbortError") {
            console.warn("Video play aborted:", playErr.name);
          } else {
            console.error("Video play error:", playErr.name);
          }
          if (streamRef.current) {
            setCameraStatus("active");
          }
        }
      }
    } catch (err) {
      if (isCancelled && isCancelled()) return;

      console.error("Akses kamera gagal:", err.name || "UnknownError");
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Izin akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("Perangkat kamera tidak ditemukan. Pastikan kamera terpasang dan berfungsi.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setCameraError("Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi tersebut dan coba lagi.");
      } else {
        setCameraError(`Gagal membuka kamera: ${err.message || err.name || "Terjadi kesalahan sistem."}`);
      }
      setCameraStatus("error");
    } finally {
      if (!isCancelled || !isCancelled()) {
        setCameraLoading(false);
      }
    }
  };

  // Panggil mulaiKamera lewat useEffect dengan flag "dibatalkan" lokal (Requirement 2)
  useEffect(() => {
    let dibatalkan = false;

    if (isRegistering) {
      mulaiKamera(() => dibatalkan);
    }

    return () => {
      dibatalkan = true;
      stopCamera();
    };
  }, [isRegistering]);

  // Cleanup preview URL saat unmount
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {}
      });
      previewUrlsRef.current = [];
    };
  }, []);

  /**
   * Helper untuk membersihkan object URL pratinjau foto
   */
  const bersihkanPreviewUrls = () => {
    previewUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
    });
    previewUrlsRef.current = [];
  };

  /**
   * Handler untuk menyetujui kebijakan biometrik: POST /api/wajah/persetujuan
   */
  const handleSimpanPersetujuan = async () => {
    if (!setujuChecked) return;
    try {
      setSubmittingPersetujuan(true);
      setErrorMessage("");
      await api.post("/wajah/persetujuan", { setuju: true });
      setStatusData((prev) => ({ ...prev, disetujui: true }));
      setSuccessToast("Persetujuan biometrik berhasil disimpan.");
      setTimeout(() => setSuccessToast(""), 3000);
      setIsRegistering(true);
    } catch (err) {
      console.error("Gagal menyimpan persetujuan:", err.name || "PersetujuanError");
      setErrorMessage(err.message || "Gagal menyimpan persetujuan.");
    } finally {
      setSubmittingPersetujuan(false);
    }
  };

  /**
   * Memulai proses pendaftaran baru / daftar ulang
   */
  const handleMulaiDaftar = () => {
    setErrorMessage("");
    bersihkanPreviewUrls();
    setCapturedSamples([]);
    setCurrentStep(1);
    setIsRegistering(true);
    mulaiKamera();
  };

  /**
   * Menangkap frame foto untuk langkah saat ini ke canvas tanpa mematikan video
   */
  const handleAmbilFoto = async () => {
    if (!videoRef.current || cameraError) return;

    try {
      // Tangkap frame ke Blob tanpa mematikan stream video
      const blob = await captureVideoFrameToBlob(videoRef.current, 640, 0.85);
      const previewUrl = URL.createObjectURL(blob);
      previewUrlsRef.current.push(previewUrl);

      const newSample = {
        step: currentStep,
        blob,
        previewUrl,
      };

      const updated = [...capturedSamples, newSample];
      setCapturedSamples(updated);

      if (currentStep < 3) {
        // Melanjutkan ke step berikutnya, stream kamera TETAP BERJALAN
        setCurrentStep((prev) => prev + 1);
      } else {
        // Semua 3 foto sudah diambil, matikan kamera
        stopCamera();
      }
    } catch (err) {
      console.error("Gagal menangkap foto:", err.name || "CaptureError");
      setErrorMessage("Gagal mengambil foto. Pastikan kamera terpasang dengan baik.");
    }
  };

  /**
   * Ulangi pengambilan foto dari langkah pertama
   */
  const handleUlangiSemua = () => {
    bersihkanPreviewUrls();
    setCapturedSamples([]);
    setCurrentStep(1);
    mulaiKamera();
  };

  /**
   * Membatalkan proses pendaftaran dan mematikan kamera
   */
  const handleBatalDaftar = () => {
    stopCamera();
    bersihkanPreviewUrls();
    setCapturedSamples([]);
    setCurrentStep(1);
    setIsRegistering(false);
  };

  /**
   * Mengirim 3 sampel foto sekaligus ke server: POST /api/wajah/daftar (multipart/form-data)
   */
  const handleKirimPendaftaran = async () => {
    if (capturedSamples.length !== 3) {
      setErrorMessage("Diperlukan tepat 3 foto sampel wajah.");
      return;
    }

    try {
      setSubmittingSamples(true);
      setErrorMessage("");

      const formData = new FormData();
      capturedSamples.forEach((sample, idx) => {
        formData.append("foto", sample.blob, `sample_${idx + 1}.jpg`);
      });

      const res = await api.post("/wajah/daftar", formData);

      // Jalur sukses: pastikan kamera dimatikan
      stopCamera();
      bersihkanPreviewUrls();
      setCapturedSamples([]);
      setIsRegistering(false);
      setSuccessToast(res.message || "Pendaftaran 3 sampel wajah berhasil!");
      setTimeout(() => setSuccessToast(""), 4000);

      // Refresh status terbaru dari server
      await fetchStatus();
    } catch (err) {
      console.error("Gagal mendaftar wajah:", err.name || "UploadError");
      // Jalur gagal upload: pastikan kamera dimatikan
      stopCamera();
      const errData = err.data || {};
      setErrorMessage(
        errData.message || err.message || "Gagal mengunggah sampel wajah ke server."
      );
    } finally {
      setSubmittingSamples(false);
    }
  };

  /**
   * Menghapus semua sampel data wajah milik pengguna: DELETE /api/wajah
   */
  const handleHapusDataWajah = async () => {
    const konfirmasi = window.confirm(
      "Apakah Anda yakin ingin menghapus seluruh data biometrik wajah Anda? Foto sampel akan dihapus permanen dari server dan Anda harus mendaftar ulang sebelum dapat melakukan presensi."
    );
    if (!konfirmasi) return;

    try {
      setLoadingStatus(true);
      setErrorMessage("");
      const res = await api.delete("/wajah");
      setSuccessToast(res.message || "Data biometrik wajah berhasil dihapus.");
      setTimeout(() => setSuccessToast(""), 3000);
      await fetchStatus();
    } catch (err) {
      console.error("Gagal menghapus data wajah:", err);
      setErrorMessage(err.message || "Gagal menghapus data wajah.");
    } finally {
      setLoadingStatus(false);
    }
  };

  const panduanSaatIni = PANDUAN_FOTO[currentStep - 1] || PANDUAN_FOTO[0];

  return (
    <div className="mobile-page-wrapper">
      {/* Header Halaman */}
      <Header
        variant="sub"
        title="Pendaftaran Wajah"
        subtitle="Verifikasi Biometrik Presensi Kuliah"
        onBack={() => {
          stopCamera();
          navigate(-1);
        }}
      />

      <main className="beranda-content" style={{ paddingBottom: 32 }}>
        {/* Toast Notifikasi Sukses */}
        {successToast && (
          <div className="success-toast" role="status" style={{ marginBottom: 16 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{successToast}</span>
          </div>
        )}

        {/* Banner Pesan Error */}
        {errorMessage && (
          <div className="danger-warning-banner" role="alert" style={{ marginBottom: 16 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div style={{ flex: 1 }}>
              <strong>Perhatian</strong>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {isRegistering ? (
          /* ================================================================= */
          /* BAGIAN 2: PANDUAN KAMERA PENGAMBILAN 3 FOTO SAMPEL                */
          /* ================================================================= */
          <div className="today-schedule-card" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "var(--telu-red)",
                    letterSpacing: "0.05em",
                  }}
                >
                  {panduanSaatIni.title}
                </span>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-main)", marginTop: 2 }}>
                  {panduanSaatIni.instruction}
                </h4>
              </div>
              <span style={{ fontSize: "1.4rem" }}>{panduanSaatIni.icon}</span>
            </div>

            {/* Viewport Kamera WebRTC dengan Oval Panduan */}
            {capturedSamples.length < 3 ? (
              <div
                className="camera-viewport-container"
                style={{
                  height: 280,
                  borderRadius: 16,
                  overflow: "hidden",
                  marginBottom: 16,
                  position: "relative",
                  background: "#0F172A",
                }}
              >
                {/* Elemen <video> SELALU dirender di dalam DOM (Requirement 1) */}
                <video
                  ref={(el) => {
                    videoRef.current = el;
                    if (el && streamRef.current && el.srcObject !== streamRef.current) {
                      el.srcObject = streamRef.current;
                      el.play().catch((err) => {
                        if (err.name !== "AbortError") {
                          console.error("Video play error:", err.name);
                        }
                      });
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  onEnded={() => {
                    if (isRegistering && capturedSamples.length < 3) {
                      console.error("Video track ended");
                      setCameraError("Video kamera terhenti. Silakan nyalakan ulang kamera.");
                      setCameraStatus("error");
                    }
                  }}
                  className="camera-video-element"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: cameraError ? "none" : "block",
                  }}
                />

                {/* Status UI: Kamera aktif badge (Requirement 4) */}
                {cameraStatus === "active" && !cameraLoading && !cameraError && (
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      background: "rgba(16, 185, 129, 0.85)",
                      color: "#FFFFFF",
                      padding: "4px 10px",
                      borderRadius: 20,
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      zIndex: 5,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#FFFFFF",
                        display: "inline-block",
                      }}
                    />
                    <span>Kamera aktif</span>
                  </div>
                )}

                {/* Oval Panduan Wajah */}
                {!cameraError && !cameraLoading && (
                  <div className="face-guide-overlay">
                    <div className="face-guide-oval" />
                    <p className="face-guide-instruction">
                      {currentStep === 1
                        ? "Hadap Lurus ke Kamera"
                        : currentStep === 2
                        ? "Miringkan Sedikit ke Kiri"
                        : "Miringkan Sedikit ke Kanan"}
                    </p>
                  </div>
                )}

                {/* Status UI: Memulai kamera... (Requirement 4) */}
                {cameraLoading && (
                  <div className="camera-loading-overlay">
                    <div className="spinner-border" />
                    <span>Memulai kamera...</span>
                  </div>
                )}

                {/* Status UI: Pesan error spesifik & tombol Coba lagi (Requirement 4) */}
                {cameraError && (
                  <div className="camera-error-box">
                    <svg
                      width="36"
                      height="36"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#DC2626"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <h5 style={{ marginTop: 8, color: "#DC2626", fontWeight: 700, fontSize: "0.95rem" }}>
                      Kamera Tidak Tersedia
                    </h5>
                    <p className="camera-error-desc" style={{ marginTop: 4 }}>
                      {cameraError}
                    </p>
                    <button
                      type="button"
                      onClick={() => mulaiKamera()}
                      className="btn-retry-location"
                      style={{ marginTop: 12 }}
                    >
                      Coba lagi
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Review 3 Foto Terkumpul */
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid var(--border-card)",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                  textAlign: "center",
                }}
              >
                <span style={{ fontSize: "1.8rem" }}>🎉</span>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginTop: 6 }}>
                  3 Sampel Wajah Berhasil Diambil
                </h4>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
                  Periksa pratinjau foto di bawah ini sebelum mengirim ke server.
                </p>
              </div>
            )}

            {/* Pratinjau 3 Thumbnail Foto */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
              {[1, 2, 3].map((stepNum) => {
                const sample = capturedSamples.find((s) => s.step === stepNum);
                const isCurrent = currentStep === stepNum && capturedSamples.length < 3;

                return (
                  <div
                    key={stepNum}
                    style={{
                      border: isCurrent
                        ? "2px solid var(--telu-red)"
                        : "1px solid var(--border-card)",
                      borderRadius: 12,
                      padding: 6,
                      background: isCurrent ? "#FFF5F5" : "#FFFFFF",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: 70,
                        borderRadius: 8,
                        background: "#F1F5F9",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 6,
                      }}
                    >
                      {sample ? (
                        <img
                          src={sample.previewUrl}
                          alt={`Sampel ${stepNum}`}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)" }}>
                          {stepNum === 1 ? "Lurus" : stepNum === 2 ? "Kiri" : "Kanan"}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-main)" }}>
                      Foto {stepNum}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Tombol Aksi Kamera / Submit */}
            <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
              {capturedSamples.length < 3 ? (
                <button
                  type="button"
                  disabled={cameraLoading || Boolean(cameraError)}
                  onClick={handleAmbilFoto}
                  className="btn-schedule-action"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span>Ambil Foto {currentStep} dari 3</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submittingSamples}
                  onClick={handleKirimPendaftaran}
                  className="btn-schedule-action"
                  style={{ background: "#059669" }}
                >
                  {submittingSamples ? (
                    <>
                      <div className="spinner-border-sm" />
                      <span>Mengunggah Sampel Wajah...</span>
                    </>
                  ) : (
                    <>
                      <span>✓ Simpan & Daftarkan Wajah</span>
                    </>
                  )}
                </button>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                {capturedSamples.length > 0 && (
                  <button
                    type="button"
                    onClick={handleUlangiSemua}
                    disabled={submittingSamples}
                    className="btn-modal-cancel"
                    style={{ flex: 1 }}
                  >
                    🔄 Ulangi Semua
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleBatalDaftar}
                  disabled={submittingSamples}
                  className="btn-modal-cancel"
                  style={{ flex: 1 }}
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        ) : !statusData.disetujui ? (
          /* ================================================================= */
          /* BAGIAN 1: PERSETUJUAN PENGGUNAAN DATA BIOMETRIK WAJAH            */
          /* ================================================================= */
          <div className="today-schedule-card" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "#FEECEE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.2rem",
                }}
              >
                🛡️
              </div>
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)" }}>
                  Persetujuan Data Biometrik
                </h3>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Prinsip Keamanan & Privasi Data
                </span>
              </div>
            </div>

            <div
              style={{
                fontSize: "0.82rem",
                color: "var(--text-muted)",
                lineHeight: 1.6,
                background: "#F8FAFC",
                padding: "14px 16px",
                borderRadius: 12,
                border: "1px solid var(--border-card)",
                marginBottom: 16,
              }}
            >
              <p style={{ marginBottom: 8 }}>
                Sesuai kebijakan perlindungan data pribadi mahasiswa:
              </p>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                <li>Foto sampel wajah <strong>hanya digunakan</strong> untuk verifikasi presensi perkuliahan.</li>
                <li>Foto disimpan secara aman pada server internal dan <strong>tidak dapat diakses publik</strong>.</li>
                <li>Anda memiliki hak untuk <strong>menghapus seluruh data wajah Anda kapan saja</strong>.</li>
              </ul>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--text-main)",
                cursor: "pointer",
                marginBottom: 20,
              }}
            >
              <input
                type="checkbox"
                checked={setujuChecked}
                onChange={(e) => setSetujuChecked(e.target.checked)}
                style={{ marginTop: 3, width: 18, height: 18, accentColor: "var(--telu-red)" }}
              />
              <span>
                Saya menyetujui pemrosesan foto wajah saya untuk verifikasi presensi kuliah.
              </span>
            </label>

            <button
              type="button"
              disabled={!setujuChecked || submittingPersetujuan}
              onClick={handleSimpanPersetujuan}
              className="btn-schedule-action"
              style={{
                opacity: !setujuChecked || submittingPersetujuan ? 0.6 : 1,
                cursor: !setujuChecked || submittingPersetujuan ? "not-allowed" : "pointer",
              }}
            >
              {submittingPersetujuan ? "Menyimpan Persetujuan..." : "Lanjutkan ke Pendaftaran Wajah →"}
            </button>
          </div>
        ) : (
          /* ================================================================= */
          /* BAGIAN 3: STATUS TERDAFTAR ATAU BELUM DAFTAR                      */
          /* ================================================================= */
          <div className="today-schedule-card" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: statusData.sudahDaftar ? "#ECFDF5" : "#FEF3C7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.4rem",
                }}
              >
                {statusData.sudahDaftar ? "✓" : "📷"}
              </div>
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: statusData.sudahDaftar ? "#059669" : "#D97706",
                    letterSpacing: "0.05em",
                  }}
                >
                  {statusData.sudahDaftar ? "Status Biometrik: Aktif" : "Status: Belum Terdaftar"}
                </span>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)" }}>
                  {statusData.sudahDaftar ? "Wajah Terdaftar" : "Sampel Wajah Belum Ada"}
                </h3>
              </div>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 16 }}>
              {statusData.sudahDaftar
                ? `Tersimpan ${statusData.jumlahSample || 3} dari ${statusData.targetSample || 3} sampel foto biometrik. Foto ini menjadi referensi pencocokan wajah saat Anda melakukan presensi perkuliahan.`
                : "Anda belum mendaftarkan sampel wajah. Daftarkan 3 sudut foto wajah Anda agar dapat melakukan presensi kehadiran perkuliahan."}
            </p>

            {/* Galeri Sampel Wajah Terdaftar (Memakai SecureImage berotorisasi token) */}
            {statusData.sudahDaftar && statusData.daftarSample?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--text-main)",
                    marginBottom: 8,
                  }}
                >
                  Sampel Wajah Tersimpan:
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {statusData.daftarSample.map((sample, idx) => (
                    <div
                      key={sample.id || idx}
                      style={{
                        borderRadius: 12,
                        overflow: "hidden",
                        border: "1px solid var(--border-card)",
                        background: "#F8FAFC",
                        textAlign: "center",
                      }}
                    >
                      <SecureImage
                        src={sample.url}
                        alt={`Sampel ${sample.urutan || idx + 1}`}
                        style={{ width: "100%", height: 84 }}
                      />
                      <span
                        style={{
                          display: "block",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          padding: "4px 2px",
                          color: "var(--text-muted)",
                        }}
                      >
                        Sampel {sample.urutan || idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tombol Aksi */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                onClick={handleMulaiDaftar}
                className="btn-schedule-action"
              >
                <span>{statusData.sudahDaftar ? "🔄 Ambil Ulang / Ganti Sampel Wajah" : "📸 Daftarkan Wajah Sekarang"}</span>
              </button>

              {statusData.sudahDaftar && (
                <button
                  type="button"
                  onClick={handleHapusDataWajah}
                  className="btn-modal-cancel"
                  style={{ color: "#DC2626", borderColor: "#FCA5A5" }}
                >
                  🗑️ Hapus Data Wajah Saya (Hak Hapus Data)
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  navigate("/presensi");
                }}
                className="btn-modal-cancel"
              >
                Menuju Halaman Presensi →
              </button>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
