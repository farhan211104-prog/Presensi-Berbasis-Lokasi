import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import BottomNavDosen from "../../components/dosen/BottomNavDosen";
import { useAuth } from "../../context/AuthContext";
import { useAttendance } from "../../context/AttendanceContext";

// Halaman Profil Akun Dosen
export default function AkunDosen() {
  const { user, logout } = useAuth();
  const { matkulDosen } = useAttendance();
  const navigate = useNavigate();

  const handleLogout = () => {
    const konfirmasi = window.confirm("Apakah Anda yakin ingin keluar dari akun dosen?");
    if (konfirmasi) {
      logout();
      navigate("/login");
    }
  };

  return (
    <div className="mobile-page-wrapper">
      {/* Header dengan tombol kembali ke Beranda Dosen */}
      <Header variant="subpage" title="Akun Dosen" />

      <main className="subpage-content">
        {/* 1. Kartu Profil Utama Dosen */}
        <div className="profile-main-card">
          <div className="profile-avatar-large">
            BR
          </div>
          <div className="profile-details-center">
            <h3 className="profile-name-lg">
              {user?.nama || "Dr. Bayu Rima Pratama, S.T., M.T."}
            </h3>
            <span className="profile-badge-role">
              Dosen Tetap • Kode: {user?.username || "BRP"}
            </span>
          </div>

          <div className="profile-info-list">
            <div className="profile-info-row">
              <span className="info-row-label">NIP</span>
              <span className="info-row-value">198506142010121002</span>
            </div>
            <div className="profile-info-row">
              <span className="info-row-label">Program Studi</span>
              <span className="info-row-value">S1 Informatika</span>
            </div>
            <div className="profile-info-row">
              <span className="info-row-label">Fakultas</span>
              <span className="info-row-value">Fakultas Informatika (FIF)</span>
            </div>
            <div className="profile-info-row">
              <span className="info-row-label">Universitas</span>
              <span className="info-row-value">Telkom University Bandung</span>
            </div>
            <div className="profile-info-row">
              <span className="info-row-label">Status Akademik</span>
              <span className="info-row-value text-success">● Aktif Mengajar</span>
            </div>
          </div>
        </div>

        {/* 2. Daftar Mata Kuliah yang Diampu */}
        <div className="section-block">
          <h4 className="section-title-sub">Mata Kuliah Semester Ini</h4>
          <div className="akun-matkul-list">
            {matkulDosen.map((m) => (
              <div
                key={m.id}
                className="akun-matkul-item"
                onClick={() => navigate(`/dosen/matkul/${m.id}`)}
                role="button"
                tabIndex={0}
              >
                <div className="akun-matkul-left">
                  <span className="akun-matkul-kode">{m.kode}</span>
                  <span className="akun-matkul-nama">{m.nama}</span>
                  <span className="akun-matkul-jadwal">
                    {m.hari}, {m.waktu} • Ruang {m.ruangan}
                  </span>
                </div>
                <div className="akun-matkul-arrow">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Informasi Sistem / Prototipe TA */}
        <div className="ta-prototype-box">
          <div className="ta-box-header">
            <span className="ta-box-icon">🎓</span>
            <div>
              <strong>Prototipe Presensi Cerdas</strong>
              <p>Sistem Presensi Mahasiswa Berbasis Lokasi & Verifikasi Kamera</p>
            </div>
          </div>
          <p className="ta-box-desc">
            Sistem terintegrasi secara real-time antara portal Mahasiswa dan portal Dosen
            menggunakan toleransi keterlambatan 15 menit dan penyimpanan lokal sinkron.
          </p>
        </div>

        {/* 4. Tombol Logout */}
        <div className="logout-button-container">
          <button type="button" onClick={handleLogout} className="btn-logout-full">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Keluar dari Akun Dosen</span>
          </button>
        </div>
      </main>

      {/* Navigasi Bawah Khusus Dosen */}
      <BottomNavDosen />
    </div>
  );
}
