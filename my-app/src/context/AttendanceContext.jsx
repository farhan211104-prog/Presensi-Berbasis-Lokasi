import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { JADWAL_HARI_INI, INITIAL_REKAP_KEHADIRAN } from "../data/mockData";
import { IZINKAN_PRESENSI_ULANG } from "../config/lokasi";
import {
  TOLERANSI_TERLAMBAT_MENIT,
  DEFAULT_SESI_BUKA,
  MINGGU_BERJALAN_DEFAULT,
} from "../config/presensiConfig";
import { getWaktuSekarang, formatJamMenit } from "../utils/waktu";
import { tentukanStatusPresensi } from "../utils/status";
import {
  MATKUL_DOSEN_BRP,
  MAHASISWA_PER_MATKUL,
  DUMMY_ATTENDANCE_PATTERNS,
  DUMMY_PRESENSI_HARI_INI_LAINNYA,
} from "../data/dosenData";

// Context bersama untuk presensi Mahasiswa dan Dosen
const AttendanceContext = createContext(null);

export function AttendanceProvider({ children }) {
  // 1. State presensi mahasiswa hari ini (tersimpan di localStorage)
  const [presensiHariIni, setPresensiHariIni] = useState(() => {
    try {
      const saved = localStorage.getItem("telu_presensi_hari_ini");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Gagal membaca presensi dari localStorage:", e);
      return {};
    }
  });

  // 2. State rekap presensi mahasiswa mingguan (tersimpan di localStorage)
  const [rekapList, setRekapList] = useState(() => {
    try {
      const saved = localStorage.getItem("telu_rekap_kehadiran");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Gagal membaca rekap dari localStorage:", e);
    }
    return INITIAL_REKAP_KEHADIRAN;
  });

  // 3. State sesi presensi dosen (Buka / Tutup per mata kuliah)
  const [sesiPresensi, setSesiPresensi] = useState(() => {
    try {
      const saved = localStorage.getItem("telu_sesi_presensi");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Gagal membaca sesi presensi dari localStorage:", e);
    }
    // Default sesi: terbuka untuk mata kuliah hari ini saat dev mode
    return {
      AZK4BAA2: DEFAULT_SESI_BUKA,
      CSG4C3: DEFAULT_SESI_BUKA,
      CSG3J3: DEFAULT_SESI_BUKA,
    };
  });

  // 4. State pengubahan manual status oleh Dosen (tersimpan di localStorage)
  // Format key: `${courseId}_${pertemuan}_${nim}` -> { status, catatan, diubahDosen: true, diubahPada }
  const [manualOverrides, setManualOverrides] = useState(() => {
    try {
      const saved = localStorage.getItem("telu_manual_overrides");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Gagal membaca manual overrides dari localStorage:", e);
      return {};
    }
  });

  // 5. State materi per pertemuan yang disimpan dosen
  const [catatanMateri, setCatatanMateri] = useState(() => {
    try {
      const saved = localStorage.getItem("telu_catatan_materi");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Gagal membaca catatan materi dari localStorage:", e);
      return {};
    }
  });

  // 6. State simulasi waktu untuk keperluan pengujian dev mode
  const [simulasiWaktuState, setSimulasiWaktuState] = useState(() => {
    try {
      const saved = localStorage.getItem("telu_simulasi_waktu");
      return saved ? JSON.parse(saved) : { aktif: false, jam: "14:30" };
    } catch (e) {
      return { aktif: false, jam: "14:30" };
    }
  });

  // Simpan perubahan ke localStorage
  useEffect(() => {
    localStorage.setItem("telu_presensi_hari_ini", JSON.stringify(presensiHariIni));
  }, [presensiHariIni]);

  useEffect(() => {
    localStorage.setItem("telu_rekap_kehadiran", JSON.stringify(rekapList));
  }, [rekapList]);

  useEffect(() => {
    localStorage.setItem("telu_sesi_presensi", JSON.stringify(sesiPresensi));
  }, [sesiPresensi]);

  useEffect(() => {
    localStorage.setItem("telu_manual_overrides", JSON.stringify(manualOverrides));
  }, [manualOverrides]);

  useEffect(() => {
    localStorage.setItem("telu_catatan_materi", JSON.stringify(catatanMateri));
  }, [catatanMateri]);

  useEffect(() => {
    localStorage.setItem("telu_simulasi_waktu", JSON.stringify(simulasiWaktuState));
  }, [simulasiWaktuState]);

  // SINKRONISASI REAL-TIME LINTAS TAB (STORAGE EVENT LISTENER)
  // Memungkinkan dosen di tab B langsung melihat presensi mahasiswa di tab A tanpa reload
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (!e.key) return;
      try {
        if (e.key === "telu_presensi_hari_ini" && e.newValue) {
          setPresensiHariIni(JSON.parse(e.newValue));
        } else if (e.key === "telu_rekap_kehadiran" && e.newValue) {
          setRekapList(JSON.parse(e.newValue));
        } else if (e.key === "telu_sesi_presensi" && e.newValue) {
          setSesiPresensi(JSON.parse(e.newValue));
        } else if (e.key === "telu_manual_overrides" && e.newValue) {
          setManualOverrides(JSON.parse(e.newValue));
        } else if (e.key === "telu_simulasi_waktu" && e.newValue) {
          setSimulasiWaktuState(JSON.parse(e.newValue));
        }
      } catch (err) {
        console.error("Gagal sinkronisasi storage event:", err);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Cek apakah sesi presensi untuk mata kuliah tertentu sedang dibuka oleh dosen
  const isSesiBuka = useCallback(
    (courseId) => {
      if (sesiPresensi[courseId] !== undefined) {
        return sesiPresensi[courseId];
      }
      return DEFAULT_SESI_BUKA;
    },
    [sesiPresensi]
  );

  // Toggle buka/tutup sesi presensi oleh dosen
  const toggleSesiPresensi = (courseId) => {
    setSesiPresensi((prev) => {
      const statusSaatIni = prev[courseId] !== undefined ? prev[courseId] : DEFAULT_SESI_BUKA;
      return {
        ...prev,
        [courseId]: !statusSaatIni,
      };
    });
  };

  // FUNGSI INTI: Mahasiswa melakukan presensi (menghitung Hadir vs Terlambat otomatis)
  const lakukanPresensi = (courseId, lokasiData = null) => {
    // 1. Cek apakah sesi presensi dibuka oleh dosen
    if (!isSesiBuka(courseId)) {
      return {
        success: false,
        message: "Sesi presensi belum dibuka oleh dosen pengampu.",
      };
    }

    // 2. Cek apakah sudah presensi (jika mode demo presensi ulang tidak aktif)
    if (presensiHariIni[courseId]?.sudahPresensi && !IZINKAN_PRESENSI_ULANG) {
      return {
        success: false,
        message: "Anda sudah melakukan presensi untuk perkuliahan ini.",
      };
    }

    // 3. Ambil waktu saat ini melalui utilitas getWaktuSekarang (membaca waktu simulasi jika aktif)
    const waktuSekarang = getWaktuSekarang();
    const jamMenitStr = formatJamMenit(waktuSekarang);

    // Cari jadwal kuliah untuk mengetahui jam mulai
    const jadwalMK =
      JADWAL_HARI_INI.find((j) => j.id === courseId) ||
      MATKUL_DOSEN_BRP.find((m) => m.id === courseId);
    const rentangWaktu = jadwalMK?.waktu || "14:30 - 16:30";

    // Hitung status otomatis: Hadir jika <= jamMulai + 15 menit, Terlambat jika > 15 menit
    const hasilStatus = tentukanStatusPresensi(
      jamMenitStr,
      rentangWaktu,
      TOLERANSI_TERLAMBAT_MENIT
    );

    const keteranganJam = `${hasilStatus.label} pukul ${jamMenitStr}`;

    // 4. Update state presensi hari ini
    setPresensiHariIni((prev) => ({
      ...prev,
      [courseId]: {
        sudahPresensi: true,
        jam: keteranganJam,
        jamRaw: jamMenitStr,
        status: hasilStatus.status, // "Hadir" atau "Terlambat"
        statusLabel: hasilStatus.label,
        selisihMenit: hasilStatus.selisihMenit,
        tanggal: waktuSekarang.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        lat: lokasiData?.lat ?? null,
        lng: lokasiData?.lng ?? null,
        jarak: lokasiData?.jarak ?? null,
        metode: lokasiData?.metode || "face-recognition-simulasi",
      },
    }));

    // 5. Sinkronisasi otomatis ke rekap kehadiran mahasiswa (pertemuan hari ini)
    setRekapList((prevRekap) => {
      return prevRekap.map((course) => {
        if (course.courseId === courseId) {
          const updatedPertemuan = course.pertemuanList.map((p) => {
            if (p.isToday) {
              return {
                ...p,
                status: hasilStatus.status, // "Hadir" atau "Terlambat"
                jamPresensi: keteranganJam,
                lokasiData: lokasiData || null,
              };
            }
            return p;
          });
          return {
            ...course,
            pertemuanList: updatedPertemuan,
          };
        }
        return course;
      });
    });

    return {
      success: true,
      status: hasilStatus.status,
      label: hasilStatus.label,
      jam: jamMenitStr,
    };
  };

  // Status presensi untuk jadwal kuliah tertentu
  const getStatusPresensi = (courseId) => {
    return (
      presensiHariIni[courseId] || {
        sudahPresensi: false,
        jam: null,
      }
    );
  };

  // Reset presensi hari ini
  const resetPresensiHariIni = () => {
    setPresensiHariIni({});
    localStorage.removeItem("telu_presensi_hari_ini");

    setRekapList((prevRekap) => {
      return prevRekap.map((course) => {
        const updatedPertemuan = course.pertemuanList.map((p) => {
          if (p.isToday) {
            return {
              ...p,
              status: "Belum Presensi",
              jamPresensi: null,
              lokasiData: null,
            };
          }
          return p;
        });
        return {
          ...course,
          pertemuanList: updatedPertemuan,
        };
      });
    });
  };

  // FITUR DOSEN: Mengubah status kehadiran manual per mahasiswa
  const ubahStatusManualDosen = (courseId, pertemuanKe, nim, newStatus, catatan = "") => {
    const key = `${courseId}_${pertemuanKe}_${nim}`;
    const overrideObj = {
      status: newStatus,
      catatan: catatan || "",
      diubahDosen: true,
      diubahPada: formatJamMenit(),
    };

    setManualOverrides((prev) => ({
      ...prev,
      [key]: overrideObj,
    }));

    // Jika yang diubah adalah akun Farhan pada pertemuan berjalan (Minggu ke-8), sinkronkan ke sisi mahasiswa
    if (nim === "101012300373" && pertemuanKe === MINGGU_BERJALAN_DEFAULT) {
      setPresensiHariIni((prev) => ({
        ...prev,
        [courseId]: {
          ...(prev[courseId] || {}),
          sudahPresensi: newStatus === "Hadir" || newStatus === "Terlambat",
          status: newStatus,
          statusLabel: newStatus,
          jam: `${newStatus} (Diubah Dosen)`,
        },
      }));

      setRekapList((prevRekap) => {
        return prevRekap.map((c) => {
          if (c.courseId === courseId) {
            const updated = c.pertemuanList.map((p) => {
              if (p.isToday) {
                return {
                  ...p,
                  status: newStatus,
                  jamPresensi: `${newStatus} (Diubah Dosen)`,
                };
              }
              return p;
            });
            return { ...c, pertemuanList: updated };
          }
          return c;
        });
      });
    }
  };

  // FITUR DOSEN: Tandai semua yang belum presensi sebagai Alpha
  const tandaiSemuaBelumPresensiAlpha = (courseId, pertemuanKe) => {
    const daftarMhs = MAHASISWA_PER_MATKUL[courseId] || [];
    const updates = {};

    daftarMhs.forEach((mhs) => {
      const presensiMhs = getPresensiSingleMahasiswa(courseId, pertemuanKe, mhs.nim);
      if (presensiMhs.status === "Belum Presensi") {
        const key = `${courseId}_${pertemuanKe}_${mhs.nim}`;
        updates[key] = {
          status: "Alpha",
          catatan: "Sesi kuliah selesai (Otomatis)",
          diubahDosen: true,
          diubahPada: formatJamMenit(),
        };
      }
    });

    setManualOverrides((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  // FITUR DOSEN: Simpan catatan materi per pertemuan
  const simpanCatatanMateri = (courseId, pertemuanKe, materi) => {
    const key = `${courseId}_${pertemuanKe}`;
    setCatatanMateri((prev) => ({
      ...prev,
      [key]: materi,
    }));
  };

  // Mengambil status presensi tunggal untuk 1 mahasiswa pada 1 pertemuan
  const getPresensiSingleMahasiswa = (courseId, pertemuanKe, nim) => {
    const key = `${courseId}_${pertemuanKe}_${nim}`;

    // 1. Cek apakah ada pengubahan manual oleh dosen
    if (manualOverrides[key]) {
      return {
        ...manualOverrides[key],
        nim,
      };
    }

    // 2. Jika pertemuan adalah pertemuan berjalan (Minggu ke-8):
    if (pertemuanKe === MINGGU_BERJALAN_DEFAULT) {
      // Jika ini Farhan dan mata kuliah AZK4BAA2, ambil data nyata dari presensiHariIni
      if (nim === "101012300373" && courseId === "AZK4BAA2") {
        const dataFarhan = presensiHariIni["AZK4BAA2"];
        if (dataFarhan && dataFarhan.sudahPresensi) {
          return {
            nim,
            status: dataFarhan.status || "Hadir",
            jam: dataFarhan.jamRaw || "14:32",
            jarak: dataFarhan.jarak ?? 12,
            metode: dataFarhan.metode || "face-recognition-simulasi",
            catatan: dataFarhan.statusLabel || "",
            diubahDosen: false,
          };
        }
        return {
          nim,
          status: "Belum Presensi",
          jam: null,
          jarak: null,
          metode: null,
          diubahDosen: false,
        };
      }

      // Untuk mahasiswa dummy lainnya pada pertemuan ke-8
      const dummyHariIni = DUMMY_PRESENSI_HARI_INI_LAINNYA[nim];
      if (dummyHariIni) {
        return {
          nim,
          ...dummyHariIni,
        };
      }
      return {
        nim,
        status: "Belum Presensi",
        jam: null,
        jarak: null,
        metode: null,
        diubahDosen: false,
      };
    }

    // 3. Untuk pertemuan minggu lalu (Minggu 1 s/d 7):
    if (pertemuanKe < MINGGU_BERJALAN_DEFAULT) {
      // Untuk Farhan, cek rekapList
      if (nim === "101012300373" && courseId === "AZK4BAA2") {
        const cRekap = rekapList.find((c) => c.courseId === "AZK4BAA2");
        const pFarhan = cRekap?.pertemuanList?.find((p) => p.pertemuan === pertemuanKe);
        if (pFarhan) {
          return {
            nim,
            status: pFarhan.status || "Hadir",
            jam: "14:30",
            jarak: 10,
            metode: "face-recognition-simulasi",
            diubahDosen: false,
          };
        }
      }

      // Untuk mahasiswa dummy, gunakan pola riwayat
      const pola = DUMMY_ATTENDANCE_PATTERNS[nim];
      const statusIdx = pertemuanKe - 1;
      const statusPola = pola && pola[statusIdx] ? pola[statusIdx] : "Hadir";

      return {
        nim,
        status: statusPola,
        jam: statusPola === "Hadir" ? "14:28" : statusPola === "Terlambat" ? "14:52" : null,
        jarak: statusPola === "Hadir" || statusPola === "Terlambat" ? 15 : null,
        metode: "face-recognition-simulasi",
        diubahDosen: false,
      };
    }

    // 4. Pertemuan di masa depan (Minggu 9 s/d 15)
    return {
      nim,
      status: "-",
      jam: null,
      jarak: null,
      metode: null,
      diubahDosen: false,
    };
  };

  // FITUR DOSEN: Mengambil seluruh presensi kelas untuk suatu pertemuan
  const getPresensiKelasPertemuan = (courseId, pertemuanKe) => {
    const daftarMhs = MAHASISWA_PER_MATKUL[courseId] || [];
    const list = daftarMhs.map((mhs) => {
      const dataP = getPresensiSingleMahasiswa(courseId, pertemuanKe, mhs.nim);
      return {
        ...mhs,
        ...dataP,
      };
    });

    // Ringkasan statistik
    let hadir = 0;
    let terlambat = 0;
    let izin = 0;
    let sakit = 0;
    let alpha = 0;
    let belum = 0;

    list.forEach((item) => {
      const s = item.status;
      if (s === "Hadir") hadir++;
      else if (s === "Terlambat") terlambat++;
      else if (s === "Izin") izin++;
      else if (s === "Sakit") sakit++;
      else if (s === "Alpha") alpha++;
      else if (s === "Belum Presensi") belum++;
    });

    const totalPeserta = list.length;
    // Hadir & Terlambat keduanya dihitung sebagai kehadiran
    const totalKehadiran = hadir + terlambat;
    const persen = totalPeserta > 0 ? Math.round((totalKehadiran / totalPeserta) * 100) : 0;

    return {
      daftar: list,
      ringkasan: {
        total: totalPeserta,
        hadir,
        terlambat,
        izin,
        sakit,
        alpha,
        belum,
        persen,
      },
    };
  };

  // FITUR DOSEN: Mengambil matriks rekap minggu 1 s/d 15 untuk satu mata kuliah
  const getMatriksRekapKelas = (courseId) => {
    const daftarMhs = MAHASISWA_PER_MATKUL[courseId] || [];
    const matriks = {};

    daftarMhs.forEach((mhs) => {
      const riwayat = {};
      let totalHadir = 0;
      let totalTerlambat = 0;
      let totalIzin = 0;
      let totalSakit = 0;
      let totalAlpha = 0;

      for (let m = 1; m <= 15; m++) {
        const pData = getPresensiSingleMahasiswa(courseId, m, mhs.nim);
        riwayat[m] = pData;

        if (m <= MINGGU_BERJALAN_DEFAULT) {
          const s = pData.status;
          if (s === "Hadir") totalHadir++;
          else if (s === "Terlambat") totalTerlambat++;
          else if (s === "Izin") totalIzin++;
          else if (s === "Sakit") totalSakit++;
          else if (s === "Alpha") totalAlpha++;
        }
      }

      // Persentase kehadiran dihitung dari pertemuan yang sudah berjalan (1 s/d 8)
      const pertemuanBerjalan = MINGGU_BERJALAN_DEFAULT;
      const countMasuk = totalHadir + totalTerlambat;
      const persen =
        pertemuanBerjalan > 0 ? Math.round((countMasuk / pertemuanBerjalan) * 100) : 0;

      matriks[mhs.nim] = {
        mhs,
        riwayat,
        stats: {
          hadir: totalHadir,
          terlambat: totalTerlambat,
          izin: totalIzin,
          sakit: totalSakit,
          alpha: totalAlpha,
          persen,
          berisiko: persen < 75,
        },
      };
    });

    return matriks;
  };

  // Reset semua data pengujian dosen dan kembalikan ke default
  const resetSemuaDataDosen = () => {
    setManualOverrides({});
    setCatatanMateri({});
    setPresensiHariIni({});
    localStorage.removeItem("telu_manual_overrides");
    localStorage.removeItem("telu_catatan_materi");
    localStorage.removeItem("telu_presensi_hari_ini");
    localStorage.removeItem("telu_rekap_kehadiran");
    setRekapList(INITIAL_REKAP_KEHADIRAN);
  };

  return (
    <AttendanceContext.Provider
      value={{
        jadwalHariIni: JADWAL_HARI_INI,
        presensiHariIni,
        rekapList,
        lakukanPresensi,
        getStatusPresensi,
        resetPresensiHariIni,
        // Properti & method khusus Dosen
        matkulDosen: MATKUL_DOSEN_BRP,
        isSesiBuka,
        toggleSesiPresensi,
        sesiPresensi,
        ubahStatusManualDosen,
        tandaiSemuaBelumPresensiAlpha,
        simpanCatatanMateri,
        catatanMateri,
        getPresensiKelasPertemuan,
        getMatriksRekapKelas,
        resetSemuaDataDosen,
        simulasiWaktuState,
        setSimulasiWaktuState,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error("useAttendance harus digunakan di dalam AttendanceProvider");
  }
  return context;
}
