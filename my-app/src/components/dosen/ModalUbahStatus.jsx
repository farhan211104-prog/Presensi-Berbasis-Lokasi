import { useState, useEffect } from "react";

// Modal Pengubahan Status Presensi Manual oleh Dosen
export default function ModalUbahStatus({
  isOpen,
  onClose,
  mahasiswa,
  pertemuanKe,
  statusSaatIni,
  catatanSaatIni,
  onSave,
}) {
  const [selectedStatus, setSelectedStatus] = useState("Hadir");
  const [catatan, setCatatan] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(
        statusSaatIni && statusSaatIni !== "-" && statusSaatIni !== "Belum Presensi"
          ? statusSaatIni
          : "Hadir"
      );
      setCatatan(catatanSaatIni || "");
    }
  }, [isOpen, statusSaatIni, catatanSaatIni]);

  if (!isOpen || !mahasiswa) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) {
      onSave(selectedStatus, catatan);
    }
    onClose();
  };

  return (
    <div className="camera-modal-backdrop" role="dialog" aria-modal="true">
      <div className="camera-modal-content" style={{ maxWidth: 420 }}>
        {/* Header Modal */}
        <div className="camera-modal-header">
          <div>
            <h3 className="camera-modal-title">Ubah Status Presensi</h3>
            <p className="camera-modal-subtitle">
              Pertemuan Minggu ke-{pertemuanKe}
            </p>
          </div>
          <button onClick={onClose} className="btn-close-modal" aria-label="Tutup">
            ✕
          </button>
        </div>

        {/* Info Mahasiswa */}
        <div className="modal-mhs-info-box">
          <div className="modal-avatar-mhs">
            {mahasiswa.nama
              ? mahasiswa.nama.substring(0, 2).toUpperCase()
              : "MH"}
          </div>
          <div>
            <h4 className="modal-mhs-nama">{mahasiswa.nama}</h4>
            <p className="modal-mhs-nim">NIM: {mahasiswa.nim}</p>
          </div>
        </div>

        {/* Form Pilihan Status & Catatan */}
        <form onSubmit={handleSubmit} className="modal-form-override">
          <div className="form-group">
            <label className="form-label">Pilih Status Baru:</label>
            <div className="status-radio-options">
              {[
                { val: "Hadir", label: "Hadir (H)", color: "#059669" },
                { val: "Terlambat", label: "Terlambat (T)", color: "#D97706" },
                { val: "Izin", label: "Izin (I)", color: "#2563EB" },
                { val: "Sakit", label: "Sakit (S)", color: "#7C3AED" },
                { val: "Alpha", label: "Alpha (A)", color: "#DC2626" },
              ].map((opt) => (
                <label
                  key={opt.val}
                  className={`status-radio-card ${
                    selectedStatus === opt.val ? "selected" : ""
                  }`}
                  style={{
                    borderColor: selectedStatus === opt.val ? opt.color : "#E2E8F0",
                  }}
                >
                  <input
                    type="radio"
                    name="statusOverride"
                    value={opt.val}
                    checked={selectedStatus === opt.val}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  />
                  <span style={{ fontWeight: 700, color: opt.color }}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Catatan / Alasan (Opsional):</label>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 12 }}
              placeholder="Contoh: Surat dokter klinik / Izin lomba kampus"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </div>

          <div className="camera-modal-actions" style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-modal-cancel"
            >
              Batal
            </button>
            <button type="submit" className="btn-modal-verify">
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
