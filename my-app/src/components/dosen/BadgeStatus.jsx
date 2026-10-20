import { STATUS_CONFIG } from "../../utils/status";

// Komponen Badge Status Kehadiran yang Konsisten di Seluruh Aplikasi
export default function BadgeStatus({ status, keterangan = "", size = "md" }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG["Belum Presensi"];

  return (
    <span
      className={`badge-status-item badge-${size}`}
      style={{
        backgroundColor: config.bg,
        color: config.color,
        borderColor: config.border,
      }}
      title={keterangan || config.label}
    >
      <span className="badge-status-dot" style={{ backgroundColor: config.color }} />
      <span className="badge-status-text">{config.label}</span>
      {keterangan && <span className="badge-status-sub">({keterangan})</span>}
    </span>
  );
}
