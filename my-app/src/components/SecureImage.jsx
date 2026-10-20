import { useState, useEffect } from "react";
import api from "../api/client";

/**
 * Komponen untuk memuat dan menampilkan gambar privat yang membutuhkan token otentikasi.
 * Menggunakan api.getBlob() dan URL.createObjectURL, serta URL.revokeObjectURL saat unmount.
 */
export default function SecureImage({
  src,
  alt = "Gambar",
  className = "",
  style = {},
  fallbackText = "Foto tidak tersedia",
}) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let createdUrl = null;

    setLoading(true);
    setError(false);

    api
      .getBlob(src)
      .then((blob) => {
        if (!isMounted) return;
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("Gagal memuat gambar privat:", err);
        setError(true);
        setLoading(false);
      });

    return () => {
      isMounted = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [src]);

  if (loading) {
    return (
      <div
        className={`secure-img-skeleton ${className}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-card-alt, #F1F5F9)",
          ...style,
        }}
      >
        <div className="spinner-border-sm" style={{ width: 16, height: 16 }} />
      </div>
    );
  }

  if (error || !objectUrl) {
    return (
      <div
        className={`secure-img-error ${className}`}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-card-alt, #F8FAFC)",
          color: "var(--text-muted, #94A3B8)",
          fontSize: "0.72rem",
          padding: 4,
          textAlign: "center",
          ...style,
        }}
      >
        <span>📷</span>
        <span style={{ fontSize: "0.65rem", marginTop: 2 }}>{fallbackText}</span>
      </div>
    );
  }

  return (
    <img
      src={objectUrl}
      alt={alt}
      className={className}
      style={{ objectFit: "cover", ...style }}
    />
  );
}
