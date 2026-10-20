import { useNavigate } from "react-router-dom";

// Komponen Tombol Fitur Utama di Beranda Tel-U
// Desain: Kotak rounded dengan border tipis, ikon SVG di atas, label di bawah
export default function FeatureButton({ icon, label, to, badge }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(to)}
      className="feature-button"
      type="button"
    >
      {/* Badge notifikasi opsional (misal: jika ada kuliah hari ini) */}
      {badge && <span className="feature-badge">{badge}</span>}

      {/* Kontainer Ikon SVG di bagian atas */}
      <div className="feature-icon-wrapper">{icon}</div>

      {/* Label teks fitur di bagian bawah */}
      <span className="feature-label">{label}</span>
    </button>
  );
}
