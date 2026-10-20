// Middleware penanganan error terpusat
export function errorHandler(err, req, res, next) {
  // Catat error pada log server untuk proses debugging oleh pengembang
  console.error(`[Error ${req.method} ${req.url}]:`, err.message);

  // Tentukan status code (default 500 jika tidak disediakan)
  const statusCode =
    typeof err.statusCode === "number" && err.statusCode >= 400 && err.statusCode < 600
      ? err.statusCode
      : 500;

  // Pastikan respon selalu JSON { message: "..." } tanpa membocorkan stack trace ke klien
  res.status(statusCode).json({
    message: err.message || "Terjadi kesalahan internal pada server",
  });
}

// Handler rute 404 jika endpoint tidak ditemukan
export function notFoundHandler(req, res) {
  res.status(404).json({
    message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`,
  });
}
