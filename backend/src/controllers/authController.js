import bcrypt from "bcryptjs";
import db from "../db/connection.js";
import { generateToken } from "../utils/jwt.js";

// Prepared statement untuk query pencarian user berdasarkan username
const findUserByUsernameStmt = db.prepare(
  "SELECT id, username, password_hash, role, nama, nim_nip FROM users WHERE username = ?"
);

// Handler POST /api/auth/login
export async function login(req, res, next) {
  try {
    const { username, password, role } = req.body;

    // 1. Validasi input: wajib string, tidak boleh kosong, panjang wajar
    if (
      !username ||
      typeof username !== "string" ||
      username.trim().length === 0 ||
      username.length > 50
    ) {
      return res.status(400).json({
        message: "Username wajib diisi dengan format yang benar",
      });
    }

    if (
      !password ||
      typeof password !== "string" ||
      password.trim().length === 0 ||
      password.length > 100
    ) {
      return res.status(400).json({
        message: "Password wajib diisi dengan format yang benar",
      });
    }

    if (
      !role ||
      typeof role !== "string" ||
      !["mahasiswa", "dosen"].includes(role.toLowerCase())
    ) {
      return res.status(400).json({
        message: "Peran harus berupa mahasiswa atau dosen",
      });
    }

    // 2. Cari data pengguna menggunakan prepared statement
    const cleanUsername = username.trim();
    const cleanRole = role.toLowerCase().trim();

    const user = findUserByUsernameStmt.get(cleanUsername);

    // Pesan error standar agar tidak membocorkan keberadaan username (Anti-User Enumeration)
    const invalidCredentialsMessage = "Username atau password salah";

    if (!user) {
      return res.status(401).json({ message: invalidCredentialsMessage });
    }

    // 3. Bandingkan password hash menggunakan bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: invalidCredentialsMessage });
    }

    // 4. Pastikan peran cocok dengan yang dipilih di form
    if (user.role !== cleanRole) {
      return res.status(401).json({ message: invalidCredentialsMessage });
    }

    // 5. Buat JWT token yang berisi id dan role
    const token = generateToken({
      id: user.id,
      role: user.role,
    });

    // 6. Kembalikan token dan data user (tanpa password_hash)
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nama: user.nama,
        role: user.role,
        nimNip: user.nim_nip,
      },
    });
  } catch (error) {
    next(error);
  }
}

// Handler GET /api/auth/me
export function me(req, res) {
  // req.user sudah diisi oleh middleware authRequired
  return res.status(200).json({
    user: {
      id: req.user.id,
      username: req.user.username,
      nama: req.user.nama,
      role: req.user.role,
      nimNip: req.user.nim_nip,
    },
  });
}
