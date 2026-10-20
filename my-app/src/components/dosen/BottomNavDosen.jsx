import { NavLink } from "react-router-dom";

// Komponen Bottom Navigation Bar khusus Dosen
export default function BottomNavDosen() {
  return (
    <nav className="bottom-nav">
      {/* 1. Beranda Dosen (Aktif) */}
      <NavLink
        to="/dosen"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
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

      {/* 2. Timeline (Placeholder) */}
      <NavLink
        to="/dosen/timeline"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
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

      {/* 3. Notifikasi (Placeholder) */}
      <NavLink
        to="/dosen/notifikasi"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
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

      {/* 4. Akun Dosen (Aktif) */}
      <NavLink
        to="/dosen/akun"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
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
