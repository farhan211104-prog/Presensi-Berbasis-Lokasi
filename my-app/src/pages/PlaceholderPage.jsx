import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import BottomNavDosen from "../components/dosen/BottomNavDosen";
import { useAuth } from "../context/AuthContext";

// Komponen placeholder untuk menu yang belum aktif (Timeline, Scan, Notifikasi)
export default function PlaceholderPage({ title = "Menu" }) {
  const { user } = useAuth();
  const isDosen = user?.role === "dosen";

  return (
    <div className="mobile-page-wrapper">
      <Header variant="subpage" title={title} />

      <main className="subpage-content center-flex">
        <div className="empty-placeholder-box">
          <div className="empty-icon-circle">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="1.8"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h3 className="empty-title">Segera hadir</h3>
          <p className="empty-desc">
            Fitur <strong>{title}</strong> sedang disiapkan untuk pembaruan
            aplikasi berikutnya.
          </p>
        </div>
      </main>

      {isDosen ? <BottomNavDosen /> : <BottomNav />}
    </div>
  );
}

