// Base URL API diambil dari environment variable Vite atau fallback ke localhost:3000
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Custom event untuk memberitahu AuthContext jika terjadi 401 (token kedaluwarsa / tidak valid)
export const AUTH_LOGOUT_EVENT = "telu_auth_logout";

// Wrapper fetch HTTP Client
export async function apiClient(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  // Ambil token dari localStorage
  const token = localStorage.getItem("telu_token");

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  // Konfigurasi header request: jangan set Content-Type jika body adalah FormData
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  // Otomatis sertakan header Authorization jika token tersedia
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (networkError) {
    // Tangani jika server backend mati atau tidak dapat dijangkau
    console.error("Gagal terhubung ke backend:", networkError);
    const error = new Error("Tidak dapat terhubung ke server");
    error.isNetworkError = true;
    throw error;
  }

  // Jika token tidak valid / kedaluwarsa (401), bersihkan session dan beri tahu AuthContext
  if (response.status === 401) {
    localStorage.removeItem("telu_token");
    localStorage.removeItem("telu_user");
    window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
  }

  // Jika opsi meminta blob (misal untuk gambar terotentikasi)
  if (options.responseType === "blob") {
    if (!response.ok) {
      let data = {};
      try {
        data = await response.json();
      } catch (e) {
        data = { message: `Gagal memuat file (HTTP ${response.status})` };
      }
      const error = new Error(data.message || `Request gagal dengan status ${response.status}`);
      error.status = response.status;
      error.code = data.code || null;
      error.data = data;
      throw error;
    }
    return await response.blob();
  }

  // Parse respon JSON
  let data;
  try {
    data = await response.json();
  } catch (parseError) {
    data = { message: "Gagal membaca respon server" };
  }

  // Jika response HTTP bukan 2xx, lempar error dengan pesan dari server
  if (!response.ok) {
    const error = new Error(data.message || `Request gagal dengan status ${response.status}`);
    error.status = response.status;
    error.code = data.code || data.error || null;
    error.data = data;
    throw error;
  }

  return data;
}

// Helper methods untuk kemudahan pemanggilan HTTP
export const api = {
  get: (endpoint, options = {}) =>
    apiClient(endpoint, { method: "GET", ...options }),

  getBlob: (endpoint, options = {}) =>
    apiClient(endpoint, { method: "GET", responseType: "blob", ...options }),

  post: (endpoint, body, options = {}) =>
    apiClient(endpoint, {
      method: "POST",
      body: typeof FormData !== "undefined" && body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),

  put: (endpoint, body, options = {}) =>
    apiClient(endpoint, {
      method: "PUT",
      body: typeof FormData !== "undefined" && body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),

  delete: (endpoint, options = {}) =>
    apiClient(endpoint, { method: "DELETE", ...options }),
};

export default api;
