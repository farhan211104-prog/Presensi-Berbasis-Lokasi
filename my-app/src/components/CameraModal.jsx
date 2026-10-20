import { useEffect, useRef, useState } from "react";

/**
 * Helper untuk menangkap frame dari elemen <video>, memperkecil maksimal sisi 640 px,
 * dan mengekspor sebagai JPEG Blob dengan kualitas 0.85 (sesuai spesifikasi).
 */
export function captureVideoFrameToBlob(
  videoElement,
  maxDimension = 640,
  quality = 0.85
) {
  return new Promise((resolve, reject) => {
    if (!videoElement) {
      return reject(new Error("Elemen video tidak tersedia"));
    }

    const naturalWidth = videoElement.videoWidth || 640;
    const naturalHeight = videoElement.videoHeight || 480;

    let targetWidth = naturalWidth;
    let targetHeight = naturalHeight;

    if (naturalWidth > maxDimension || naturalHeight > maxDimension) {
      if (naturalWidth >= naturalHeight) {
        targetWidth = maxDimension;
        targetHeight = Math.round((naturalHeight / naturalWidth) * maxDimension);
      } else {
        targetHeight = maxDimension;
        targetWidth = Math.round((naturalWidth / naturalHeight) * maxDimension);
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return reject(new Error("Gagal menginisialisasi 2D canvas context"));
    }

    ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          return reject(new Error("Gagal mengonversi frame kamera ke Blob"));
        }
        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

// Komponen Modal Kamera untuk Simulasi Verifikasi Wajah (Face Recognition)
export default function CameraModal({
  isOpen,
  onClose,
  onSuccess,
  courseName,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // State status kamera & verifikasi
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Fungsi untuk menghentikan seluruh track kamera agar lampu webcam/kamera mati
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.error("Gagal menghentikan track video:", e);
        }
      });
      streamRef.current = null;
    }
  };

  // Efek untuk inisialisasi dan pembersihan stream kamera saat modal dibuka/ditutup
  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      return;
    }

    setCameraLoading(true);
    setCameraError(null);
    setIsVerifying(false);

    // Minta akses kamera depan (facingMode: user)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        "Browser Anda tidak mendukung akses kamera (navigator.mediaDevices tidak tersedia)."
      );
      setCameraLoading(false);
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })
      .then((mediaStream) => {
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current
              .play()
              .catch((err) => console.warn("Video play interrupted:", err));
          };
        }
        setCameraLoading(false);
      })
      .catch((err) => {
        console.error("Kesalahan akses kamera:", err);
        setCameraLoading(false);

        // Menampilkan pesan error spesifik dalam bahasa Indonesia
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          setCameraError(
            "Izin akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda untuk melanjutkan verifikasi wajah."
          );
        } else if (
          err.name === "NotFoundError" ||
          err.name === "DevicesNotFoundError"
        ) {
          setCameraError(
            "Perangkat kamera tidak ditemukan di perangkat Anda. Pastikan kamera terpasang dan berfungsi."
          );
        } else if (
          err.name === "NotReadableError" ||
          err.name === "TrackStartError"
        ) {
          setCameraError(
            "Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi tersebut dan coba lagi."
          );
        } else {
          setCameraError(
            `Gagal membuka kamera: ${err.message || "Terjadi kesalahan sistem."}`
          );
        }
      });

    // Cleanup: pastikan kamera dimatikan ketika komponen unmount
    return () => {
      stopCameraStream();
    };
  }, [isOpen]);

  // Handler tombol "Verifikasi Wajah"
  const handleVerifyFace = async () => {
    if (cameraError || isVerifying) return;

    try {
      setIsVerifying(true);

      // Tangkap frame saat ini dari elemen video WebRTC
      const blob = await captureVideoFrameToBlob(videoRef.current, 640, 0.85);

      // Selalu matikan stream kamera segera setelah frame berhasil ditangkap
      stopCameraStream();
      setIsVerifying(false);

      // Panggil callback onSuccess dengan menyertakan Blob foto wajah
      if (onSuccess) {
        onSuccess(blob);
      }
    } catch (err) {
      console.error("Gagal mengambil frame foto kamera:", err);
      setIsVerifying(false);
      stopCameraStream();
      setCameraError(err.message || "Gagal mengambil foto wajah dari kamera.");
    }
  };

  // Handler tombol "Batal"
  const handleCancel = () => {
    stopCameraStream();
    if (onClose) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="camera-modal-backdrop" role="dialog" aria-modal="true">
      <div className="camera-modal-content">
        {/* Header Modal */}
        <div className="camera-modal-header">
          <div>
            <h3 className="camera-modal-title">Verifikasi Wajah</h3>
            <p className="camera-modal-subtitle">
              {courseName || "Presensi Kuliah"}
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="btn-close-modal"
            aria-label="Tutup"
            disabled={isVerifying}
          >
            ✕
          </button>
        </div>

        {/* Area Viewport Kamera */}
        <div className="camera-viewport-container">
          {/* Pesan Error jika kamera gagal diakses */}
          {cameraError ? (
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
              <h5 className="camera-error-title">Kamera Tidak Tersedia</h5>
              <p className="camera-error-desc">{cameraError}</p>
            </div>
          ) : (
            <>
              {/* Elemen Video WebRTC */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-video-element"
              />

              {/* Overlay Oval Panduan Wajah */}
              <div className="face-guide-overlay">
                <div
                  className={`face-guide-oval ${
                    isVerifying ? "scanning-active" : ""
                  }`}
                >
                  {/* Efek garis pemindai saat sedang verifikasi */}
                  {isVerifying && <div className="scanner-laser-line" />}
                </div>
                <p className="face-guide-instruction">
                  {isVerifying
                    ? "Sedang memindai wajah Anda..."
                    : "Posisikan wajah Anda tepat di dalam oval"}
                </p>
              </div>

              {/* Loading saat kamera pertama kali dinyalakan */}
              {cameraLoading && (
                <div className="camera-loading-overlay">
                  <div className="spinner-border" />
                  <span>Menyiapkan kamera...</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Informasi Status Verifikasi */}
        <div className="camera-info-banner">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0284C7"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>
            Simulasi Face Recognition: Pastikan pencahayaan cukup dan wajah
            terlihat jelas.
          </span>
        </div>

        {/* Tombol Aksi */}
        <div className="camera-modal-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="btn-modal-cancel"
            disabled={isVerifying}
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleVerifyFace}
            disabled={cameraLoading || Boolean(cameraError) || isVerifying}
            className="btn-modal-verify"
          >
            {isVerifying ? (
              <>
                <div className="spinner-border-sm" />
                <span>Memverifikasi (~2s)...</span>
              </>
            ) : (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <span>Verifikasi Wajah</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
