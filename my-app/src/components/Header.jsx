import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Komponen Header aplikasi Tel-U
// Memiliki 2 varian:
// 1. "main" -> Khusus Beranda: warna merah khas Tel-U, avatar inisial, info mahasiswa, tombol logout
// 2. "subpage" -> Khusus halaman dalam (Presensi, Nilai, Rekap, Akun): ada tombol kembali ke Beranda
export default function Header({ variant = "main", title = "" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Inisial untuk avatar placeholder (contoh: "BR" untuk Dr. Bayu Rima Pratama, "AF" untuk Ahmad Farhan)
  const getInitials = (name) => {
    if (!name) return "U";
    // Bersihkan gelar seperti "Dr. " di depan jika ada
    const cleanName = name.replace(/^Dr\.\s+/i, "");
    const parts = cleanName.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return cleanName.substring(0, 2).toUpperCase();
  };

  // Header untuk halaman dalam (dengan tombol kembali)
  if (variant === "subpage") {
    const targetBack = user?.role === "dosen" ? "/dosen" : "/";

    return (
      <header className="subpage-header">
        <button
          onClick={() => navigate(targetBack)}
          className="btn-back"
          aria-label="Kembali ke Beranda"
        >
          {/* SVG Ikon Panah Kiri */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span>Beranda</span>
        </button>
        <h1 className="subpage-title">{title}</h1>
        {/* Placeholder spacer agar judul berada tepat di tengah */}
        <div style={{ width: 68 }} />
      </header>
    );
  }

  // Header utama untuk Beranda Tel-U
  return (
    <header className="main-header">
      {/* Baris atas: Brand / Logo dan Tombol Logout Kecil */}
      <div className="main-header-top">
        <div className="brand-badge">
          {/* Ikon Logo Tel-U Mini */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span>PORTAL TEL-U</span>
        </div>

        {/* Tombol Logout kecil */}
        <button
          onClick={logout}
          className="btn-logout-small"
          title="Keluar dari akun"
        >
          {/* SVG Ikon Logout */}
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Keluar</span>
        </button>
      </div>

      {/* Profil: Avatar Bulat Inisial + Nama & NIM / NIP Dosen */}
      <div className="main-header-profile">
        <div className="profile-avatar">
          {getInitials(user?.nama || (user?.role === "dosen" ? "Bayu Rima" : "Ahmad Farhan"))}
        </div>
        <div className="profile-info">
          <p className="profile-greeting">Selamat Datang,</p>
          <h2 className="profile-name">
            {user?.nama || (user?.role === "dosen" ? "Dr. Bayu Rima Pratama, S.T., M.T." : "Ahmad Farhan Fitrian")}
          </h2>
          <p className="profile-subtitle">
            {user?.role === "dosen"
              ? `Dosen • ${user?.username || "BRP"}`
              : `Mahasiswa • ${user?.nim || "101012300373"}`}
          </p>
        </div>
      </div>
    </header>
  );
}
