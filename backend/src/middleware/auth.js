import db from "../db/connection.js";
import { verifyToken } from "../utils/jwt.js";

// Prepared statement untuk mencari user berdasarkan ID (aman & efisien)
const findUserByIdStmt = db.prepare(
  "SELECT id, username, role, nama, nim_nip FROM users WHERE id = ?"
);

// Middleware untuk memverifikasi token JWT pada request header
export function authRequired(req, res, next) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Token autentikasi tidak ditemukan atau format salah",
    });
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);

  if (!decoded || !decoded.id) {
    return res.status(401).json({
      message: "Token tidak valid atau telah kedaluwarsa",
    });
  }

  try {
    const user = findUserByIdStmt.get(decoded.id);
    if (!user) {
      return res.status(401).json({
        message: "Pengguna tidak ditemukan",
      });
    }

    // Lampirkan data user ke request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

// Middleware untuk memvalidasi hak akses peran (mahasiswa | dosen)
export function roleRequired(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Autentikasi diperlukan terlebih dahulu",
      });
    }

    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        message: `Akses ditolak: Dibutuhkan peran ${requiredRole}`,
      });
    }

    next();
  };
}
