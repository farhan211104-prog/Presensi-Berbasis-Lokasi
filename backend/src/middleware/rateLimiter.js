// In-memory store untuk melacak jumlah percobaan login per alamat IP
const loginAttempts = new Map();

const WINDOW_MS = 15 * 60 * 1000; // Jendela waktu: 15 menit
const MAX_ATTEMPTS = 10; // Maksimal percobaan: 10 kali

// Pembersihan berkala setiap 5 menit untuk mencegah kebocoran memori
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of loginAttempts.entries()) {
    if (now > data.resetTime) {
      loginAttempts.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref(); // unref agar tidak menahan proses Node.js saat ingin berhenti

// Middleware rate limit sederhana berbasis IP
export function loginRateLimiter(req, res, next) {
  // Dapatkan alamat IP klien
  const clientIp =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.socket.remoteAddress ||
    "unknown-ip";

  const now = Date.now();
  const record = loginAttempts.get(clientIp);

  if (!record || now > record.resetTime) {
    // Entri baru atau jendela waktu telah berakhir
    loginAttempts.set(clientIp, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });
    return next();
  }

  if (record.count >= MAX_ATTEMPTS) {
    const sisaMenit = Math.ceil((record.resetTime - now) / 60000);
    return res.status(429).json({
      message: `Terlalu banyak percobaan login. Silakan coba lagi dalam ${sisaMenit} menit.`,
    });
  }

  record.count += 1;
  return next();
}

// In-memory store untuk melacak jumlah percobaan presensi per user
const presensiAttempts = new Map();
const PRESENSI_WINDOW_MS = 5 * 60 * 1000; // 5 menit
const PRESENSI_MAX_ATTEMPTS = 20; // 20 percobaan

// Pembersihan berkala untuk presensi attempts
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of presensiAttempts.entries()) {
    if (now > data.resetTime) {
      presensiAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Middleware rate limiter untuk endpoint presensi (20 percobaan per 5 menit per user)
 */
export function presensiRateLimiter(req, res, next) {
  const key = req.user?.id
    ? `user_${req.user.id}`
    : req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress || "unknown";

  const now = Date.now();
  const record = presensiAttempts.get(key);

  if (!record || now > record.resetTime) {
    presensiAttempts.set(key, {
      count: 1,
      resetTime: now + PRESENSI_WINDOW_MS,
    });
    return next();
  }

  if (record.count >= PRESENSI_MAX_ATTEMPTS) {
    const sisaMenit = Math.ceil((record.resetTime - now) / 60000);
    return res.status(429).json({
      code: "RATE_LIMIT_EXCEEDED",
      message: `Terlalu banyak percobaan presensi. Silakan tunggu ${sisaMenit} menit sebelum mencoba kembali.`,
    });
  }

  record.count += 1;
  return next();
}

