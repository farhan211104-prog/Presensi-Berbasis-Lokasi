import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { useAuth } from "../context/AuthContext";

export default function Akun() {
  const { user, logout } = useAuth();

  return (
    <div className="mobile-page-wrapper">
      {/* Header Halaman */}
      <Header variant="subpage" title="Profil Akun" />

      <main className="subpage-content">
        {/* Kartu Profil Utama */}
        <div className="profile-card-large">
          <div className="profile-large-avatar">
            <span>AF</span>
          </div>
          <h2 className="profile-large-name">
            {user?.nama || "Ahmad Farhan Fitrian"}
          </h2>
          <span className="profile-badge-role">Mahasiswa Aktif</span>
          <p className="profile-large-nim">NIM: {user?.nim || "101012300373"}</p>
        </div>

        {/* Informasi Akademik Lengkap */}
        <div className="account-details-card">
          <h4 className="card-section-title">Informasi Akademik</h4>

          <div className="detail-item">
            <span className="detail-label">Program Studi</span>
            <span className="detail-value">{user?.prodi || "S1 Informatika"}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Fakultas</span>
            <span className="detail-value">
              {user?.fakultas || "Fakultas Informatika"}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Angkatan</span>
            <span className="detail-value">{user?.angkatan || "2023"}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Status Akademik</span>
            <span className="detail-value text-success">
              ● {user?.status || "Aktif"}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Email Kampus</span>
            <span className="detail-value">
              {user?.email || "farhan@student.telkomuniversity.ac.id"}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Dosen Wali</span>
            <span className="detail-value">
              {user?.dosenWali || "Dr. Bayu Rima Pratama, S.T., M.T."}
            </span>
          </div>
        </div>

        {/* Tombol Logout Merah */}
        <div className="logout-section">
          <button onClick={logout} className="btn-logout-full" type="button">
            <svg
              width="20"
              height="20"
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
            <span>Keluar dari Akun</span>
          </button>
        </div>
      </main>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}
