import { NavLink } from "react-router-dom";

// Komponen Bottom Navigation Bar khas aplikasi mobile Tel-U
// Terdiri dari: Beranda, Timeline, Scan (tombol bulat merah di tengah), Notifikasi, Akun
export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {/* 1. Menu Beranda (Aktif) */}
      <NavLink
        to="/"
        className={({ isActive }) =>
          `nav-item ${isActive ? "active" : ""}`
        }
        end
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>Beranda</span>
      </NavLink>

      {/* 2. Menu Timeline (Placeholder Segera Hadir) */}
      <NavLink
        to="/timeline"
        className={({ isActive }) =>
          `nav-item ${isActive ? "active" : ""}`
        }
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>Timeline</span>
      </NavLink>

      {/* 3. Tombol Scan Bulat Merah Menonjol di Tengah (Floating Action) */}
      <NavLink to="/scan" className="nav-item-scan" title="Scan Presensi">
        <div className="scan-btn-circle">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <line x1="7" y1="12" x2="17" y2="12" />
          </svg>
        </div>
        <span className="scan-label">Scan</span>
      </NavLink>

      {/* 4. Menu Notifikasi (Placeholder Segera Hadir) */}
      <NavLink
        to="/notifikasi"
        className={({ isActive }) =>
          `nav-item ${isActive ? "active" : ""}`
        }
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span>Notifikasi</span>
      </NavLink>

      {/* 5. Menu Akun (Aktif) */}
      <NavLink
        to="/akun"
        className={({ isActive }) =>
          `nav-item ${isActive ? "active" : ""}`
        }
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span>Akun</span>
      </NavLink>
    </nav>
  );
}
