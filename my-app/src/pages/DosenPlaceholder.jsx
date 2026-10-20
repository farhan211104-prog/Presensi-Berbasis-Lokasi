import { useAuth } from "../context/AuthContext";

// Halaman Placeholder untuk Peran Dosen
// Sesuai instruksi: Fokus sekarang HANYA bagian mahasiswa. Bagian dosen cukup halaman placeholder.
export default function DosenPlaceholder() {
  const { user, logout } = useAuth();

  return (
    <div className="mobile-page-wrapper center-content">
      <div className="dosen-placeholder-card">
        {/* Ikon Dosen / Pengajar */}
        <div className="placeholder-icon-circle">
          <svg
            width="42"
            height="42"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#E8313A"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>

        <span className="placeholder-badge">Peran Dosen</span>
        <h2 className="placeholder-title">Halaman dosen segera hadir</h2>
        <p className="placeholder-desc">
          Halo, Bapak/Ibu <strong>{user?.nama || "BRP"}</strong>. Portal layanan
          khusus dosen Telkom University saat ini masih dalam tahap
          pengembangan sistem.
        </p>

        {/* Tombol Logout */}
        <button onClick={logout} className="btn-logout-full" type="button">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Logout (Keluar)</span>
        </button>
      </div>
    </div>
  );
}
