import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Komponen Pembungkus Route untuk Proteksi Halaman
// Jika user belum login, diarahkan otomatis ke halaman /login
export default function ProtectedRoute({ children, allowedRole = "mahasiswa" }) {
  const { user } = useAuth();

  // 1. Cek apakah ada sesi login aktif
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Cek apakah peran user sesuai dengan yang diizinkan untuk route ini
  if (allowedRole && user.role !== allowedRole) {
    // Jika dosen mencoba buka halaman mahasiswa -> lempar ke halaman dosen
    if (user.role === "dosen") {
      return <Navigate to="/dosen" replace />;
    }
    // Jika mahasiswa mencoba buka halaman dosen -> lempar ke beranda mahasiswa
    return <Navigate to="/" replace />;
  }

  // Jika lolos semua validasi, render komponen anak (halaman tujuan)
  return children;
}
