import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DB_PATH } from "../config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pastikan direktori folder data database sudah dibuat
const resolvedDbPath = path.isAbsolute(DB_PATH)
  ? DB_PATH
  : path.resolve(__dirname, "../../", DB_PATH);

const dbDir = path.dirname(resolvedDbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let dbInstance = null;

// Inisialisasi koneksi SQLite (prioritas better-sqlite3, fallback ke node:sqlite bawaan Node.js)
try {
  const Database = (await import("better-sqlite3")).default;
  dbInstance = new Database(resolvedDbPath);
  // Aktifkan foreign key constraint
  dbInstance.pragma("foreign_keys = ON");
  // console.log("Database SQLite terhubung menggunakan better-sqlite3:", resolvedDbPath);
} catch (error) {
  console.warn(
    "better-sqlite3 gagal dimuat (" +
      error.message +
      "), beralih ke node:sqlite bawaan Node.js..."
  );
  try {
    const { DatabaseSync } = await import("node:sqlite");
    dbInstance = new DatabaseSync(resolvedDbPath);
    dbInstance.exec("PRAGMA foreign_keys = ON;");
    // console.log("Database SQLite terhubung menggunakan node:sqlite bawaan:", resolvedDbPath);
  } catch (fallbackError) {
    console.error("Gagal membuka database SQLite:", fallbackError);
    throw fallbackError;
  }
}

export default dbInstance;
