import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AttendanceProvider } from "./context/AttendanceContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Halaman-halaman portal
import Login from "./pages/Login";
import Beranda from "./pages/Beranda";
import Presensi from "./pages/Presensi";
import DaftarWajah from "./pages/DaftarWajah";
import Nilai from "./pages/Nilai";
import Rekap from "./pages/Rekap";
import Akun from "./pages/Akun";
import PlaceholderPage from "./pages/PlaceholderPage";

// Halaman-halaman portal dosen
import BerandaDosen from "./pages/dosen/BerandaDosen";
import DetailMatkul from "./pages/dosen/DetailMatkul";
import AkunDosen from "./pages/dosen/AkunDosen";

import "./App.css";

// Komponen Utama Aplikasi
export default function App() {
  return (
    // 1. AuthProvider: Menyediakan state login & data pengguna ke seluruh komponen
    <AuthProvider>
      {/* 2. AttendanceProvider: Menyediakan data presensi & sinkronisasi rekap */}
      <AttendanceProvider>
        {/* 3. BrowserRouter: Pengaturan rute URL Single Page Application (SPA) */}
        <BrowserRouter>
          <Routes>
            {/* Rute Publik: Login */}
            <Route path="/login" element={<Login />} />

            {/* Rute Mahasiswa (Terproteksi, hanya bisa diakses setelah login sebagai Mahasiswa) */}
            <Route
              path="/"
              element={
                <ProtectedRoute allowedRole="mahasiswa">
                  <Beranda />
                </ProtectedRoute>
              }
            />
            <Route
              path="/presensi"
              element={
                <ProtectedRoute allowedRole="mahasiswa">
                  <Presensi />
                </ProtectedRoute>
              }
            />
            <Route
              path="/daftar-wajah"
              element={
                <ProtectedRoute allowedRole="mahasiswa">
                  <DaftarWajah />
                </ProtectedRoute>
              }
            />
            <Route
              path="/nilai"
              element={
                <ProtectedRoute allowedRole="mahasiswa">
                  <Nilai />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rekap"
              element={
                <ProtectedRoute allowedRole="mahasiswa">
                  <Rekap />
                </ProtectedRoute>
              }
            />
            <Route
              path="/akun"
              element={
                <ProtectedRoute allowedRole="mahasiswa">
                  <Akun />
                </ProtectedRoute>
              }
            />

            {/* Menu Placeholder Mahasiswa (Timeline, Scan, Notifikasi) */}
            <Route
              path="/timeline"
              element={
                <ProtectedRoute allowedRole="mahasiswa">
                  <PlaceholderPage title="Timeline Akademik" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/scan"
              element={
                <ProtectedRoute allowedRole="mahasiswa">
                  <PlaceholderPage title="Scan Presensi QR" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifikasi"
              element={
                <ProtectedRoute allowedRole="mahasiswa">
                  <PlaceholderPage title="Notifikasi Kampus" />
                </ProtectedRoute>
              }
            />

            {/* Rute Khusus Dosen (Terproteksi, hanya bisa diakses setelah login sebagai Dosen) */}
            <Route
              path="/dosen"
              element={
                <ProtectedRoute allowedRole="dosen">
                  <BerandaDosen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dosen/matkul/:courseId"
              element={
                <ProtectedRoute allowedRole="dosen">
                  <DetailMatkul />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dosen/akun"
              element={
                <ProtectedRoute allowedRole="dosen">
                  <AkunDosen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dosen/timeline"
              element={
                <ProtectedRoute allowedRole="dosen">
                  <PlaceholderPage title="Timeline Akademik Dosen" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dosen/notifikasi"
              element={
                <ProtectedRoute allowedRole="dosen">
                  <PlaceholderPage title="Notifikasi Dosen" />
                </ProtectedRoute>
              }
            />

            {/* Fallback rute yang tidak dikenal */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AttendanceProvider>
    </AuthProvider>
  );
}