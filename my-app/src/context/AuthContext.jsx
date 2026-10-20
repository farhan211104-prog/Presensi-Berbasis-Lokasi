import { createContext, useContext, useState, useEffect } from "react";
import { api, AUTH_LOGOUT_EVENT } from "../api/client";

// Context autentikasi aplikasi
const AuthContext = createContext(null);

// Helper untuk memastikan kelengkapan atribut profil user agar kompatibel dengan UI yang ada
function formatUserData(rawUser) {
  if (!rawUser) return null;
  return {
    ...rawUser,
    nim: rawUser.nimNip || rawUser.nim || rawUser.username,
    nip: rawUser.nimNip || rawUser.nip || rawUser.username,
    prodi: rawUser.prodi || "S1 Informatika",
    fakultas: rawUser.fakultas || "Fakultas Informatika",
    angkatan: rawUser.angkatan || "2023",
    status: rawUser.status || "Aktif",
    email:
      rawUser.email ||
      (rawUser.role === "dosen"
        ? `${rawUser.username.toLowerCase()}@telkomuniversity.ac.id`
        : `${rawUser.username}@student.telkomuniversity.ac.id`),
    dosenWali: rawUser.dosenWali || "Dr. Bayu Rima Pratama, S.T., M.T.",
  };
}

export function AuthProvider({ children }) {
  // 1. Inisialisasi state user dari localStorage agar tidak berkedip saat refresh
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("telu_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error("Gagal membaca session user dari localStorage:", e);
      return null;
    }
  });

  const [loadingSession, setLoadingSession] = useState(true);

  // 2. Muat ulang sesi pengguna dari server (/api/auth/me) saat aplikasi dibuka
  useEffect(() => {
    async function restoreSession() {
      const token = localStorage.getItem("telu_token");
      if (!token) {
        setLoadingSession(false);
        return;
      }

      try {
        const data = await api.get("/auth/me");
        if (data?.user) {
          const formatted = formatUserData(data.user);
          setUser(formatted);
          localStorage.setItem("telu_user", JSON.stringify(formatted));
        }
      } catch (err) {
        console.warn("Gagal memulihkan sesi dari server:", err.message);
        // Jika token tidak valid / kedaluwarsa (401), hapus sesi
        if (err.status === 401) {
          setUser(null);
          localStorage.removeItem("telu_token");
          localStorage.removeItem("telu_user");
        }
      } finally {
        setLoadingSession(false);
      }
    }

    restoreSession();
  }, []);

  // 3. Dengarkan event logout otomatis saat token kedaluwarsa (401) dari api client
  useEffect(() => {
    const handleLogoutEvent = () => {
      setUser(null);
    };

    window.addEventListener(AUTH_LOGOUT_EVENT, handleLogoutEvent);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handleLogoutEvent);
  }, []);

  // 4. Fungsi Login dengan memanggil backend API POST /api/auth/login
  const login = async (username, password, role) => {
    // Validasi input awal di frontend
    if (!username?.trim() || !password?.trim()) {
      return {
        success: false,
        message: "Username dan password tidak boleh kosong!",
      };
    }

    try {
      const data = await api.post("/auth/login", {
        username: username.trim(),
        password: password,
        role: role,
      });

      const formatted = formatUserData(data.user);

      // Simpan token JWT dan info user di localStorage
      localStorage.setItem("telu_token", data.token);
      localStorage.setItem("telu_user", JSON.stringify(formatted));
      setUser(formatted);

      return {
        success: true,
        role: formatted.role,
      };
    } catch (err) {
      return {
        success: false,
        message: err.message || "Gagal masuk ke sistem",
      };
    }
  };

  // 5. Fungsi Logout untuk menghapus token dan data sesi
  const logout = () => {
    localStorage.removeItem("telu_token");
    localStorage.removeItem("telu_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loadingSession }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook untuk menggunakan AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }
  return context;
}
