import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  // State untuk form login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("mahasiswa"); // 'mahasiswa' atau 'dosen'
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Jika user sudah login, langsung alihkan ke halaman yang sesuai
  useEffect(() => {
    if (user) {
      if (user.role === "mahasiswa") {
        navigate("/");
      } else if (user.role === "dosen") {
        navigate("/dosen");
      }
    }
  }, [user, navigate]);

  // Handler submit login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(""); // Bersihkan pesan error sebelumnya
    setIsLoading(true);

    try {
      // Panggil fungsi login asinkron dari AuthContext
      const result = await login(username, password, role);

      if (result.success) {
        // Redirect sesuai peran user
        if (result.role === "mahasiswa") {
          navigate("/");
        } else {
          navigate("/dosen");
        }
      } else {
        // Tampilkan pesan kesalahan dari server
        setErrorMessage(result.message);
      }
    } catch (err) {
      setErrorMessage("Terjadi kesalahan sistem");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper untuk auto-fill akun demo agar penguji mudah mencoba
  const handleQuickFill = (targetRole) => {
    setRole(targetRole);
    if (targetRole === "mahasiswa") {
      setUsername("101012300373");
      setPassword("mahasiswa123");
    } else {
      setUsername("BRP");
      setPassword("dosen123");
    }
    setErrorMessage("");
  };

  return (
    <div className="login-container">
      {/* Kartu Box Login */}
      <div className="login-card">
        {/* Banner Logo Kampus Tel-U */}
        <div className="login-header">
          <div className="login-logo-circle">
            {/* SVG Logo Kampus / Simbol Pendidikan */}
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#E8313A"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <h1 className="login-title">Portal Telkom University</h1>
          <p className="login-subtitle">
            Masuk untuk mengakses layanan akademik kampus
          </p>
        </div>

        {/* Pilihan Peran: Mahasiswa atau Dosen (Toggle / Segmented Button) */}
        <div className="role-selector-wrapper">
          <label className="role-label-title">Pilih Peran Anda</label>
          <div className="role-toggle-group">
            <button
              type="button"
              className={`role-toggle-btn ${role === "mahasiswa" ? "active" : ""}`}
              onClick={() => {
                setRole("mahasiswa");
                setErrorMessage("");
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Mahasiswa</span>
            </button>

            <button
              type="button"
              className={`role-toggle-btn ${role === "dosen" ? "active" : ""}`}
              onClick={() => {
                setRole("dosen");
                setErrorMessage("");
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span>Dosen</span>
            </button>
          </div>
        </div>

        {/* Kotak Pesan Error */}
        {errorMessage && (
          <div className="error-alert" role="alert">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#DC2626"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Input */}
        <form onSubmit={handleSubmit} className="login-form">
          {/* Input Username */}
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              {role === "mahasiswa" ? "NIM / Username" : "Kode Dosen / Username"}
            </label>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder={
                  role === "mahasiswa" ? "Contoh: 101012300373" : "Contoh: BRP"
                }
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          {/* Input Password dengan Tombol Tampilkan/Sembunyikan */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="form-input has-toggle"
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {/* Tombol Tampilkan/Sembunyikan Password */}
              <button
                type="button"
                className="btn-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Sembunyikan password" : "Lihat password"}
              >
                {showPassword ? (
                  // Ikon Eye-off
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#64748B"
                    strokeWidth="2"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  // Ikon Eye
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#64748B"
                    strokeWidth="2"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Tombol Masuk Utama dengan Indikator Loading */}
          <button
            type="submit"
            className="btn-primary-login"
            disabled={isLoading}
            style={{ opacity: isLoading ? 0.8 : 1, cursor: isLoading ? "not-allowed" : "pointer" }}
          >
            {isLoading ? (
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <svg
                  style={{ animation: "spin 1s linear infinite" }}
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span>Memproses...</span>
              </span>
            ) : (
              "Masuk Sekarang"
            )}
          </button>
        </form>

        {/* Informasi Akun Dummy untuk Kemudahan Testing */}
        <div className="demo-accounts-box">
          <p className="demo-title">Akun Uji Coba (Dummy):</p>
          <div className="demo-buttons">
            <button
              type="button"
              className="demo-chip"
              onClick={() => handleQuickFill("mahasiswa")}
            >
              <span className="chip-badge">Mahasiswa</span>
              <span className="chip-cred">101012300373 / mahasiswa123</span>
            </button>
            <button
              type="button"
              className="demo-chip"
              onClick={() => handleQuickFill("dosen")}
            >
              <span className="chip-badge dosen">Dosen</span>
              <span className="chip-cred">BRP / dosen123</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
