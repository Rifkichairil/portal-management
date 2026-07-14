/**
 * Translate Supabase/PostgreSQL error codes to human-readable Indonesian messages.
 */

interface PgError {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

const PG_ERROR_INDONESIAN: Record<string, string> = {
  "23505": "Data sudah ada (duplikat). Field unique tidak boleh sama dengan data yang sudah tersimpan.",
  "23503": "Data referensi tidak ditemukan. Pastikan data yang direferensikan (foreign key) sudah ada di database.",
  "23502": "Field yang wajib diisi (NOT NULL) masih kosong.",
  "23514": "Data tidak memenuhi aturan validasi (CHECK constraint).",
  "42P01": "Tabel database tidak ditemukan. Hubungi administrator.",
  "42703": "Kolom database tidak ditemukan. Hubungi administrator.",
  "42883": "Fungsi database tidak ditemukan. Hubungi administrator.",
  "22P02": "Format data tidak sesuai (invalid input syntax).",
  "22001": "Data terlalu panjang untuk field yang dituju.",
  "42501": "Tidak memiliki izin untuk operasi ini di database.",
};

export function parsePgError(error: any): {
  reason: string;
  detail: string;
  code: string;
} {
  const message = error?.message || "Unknown error";
  const code = error?.code || "";
  const details = error?.details || "";
  const hint = error?.hint || "";

  // Translate known error code
  const indonesianMsg = PG_ERROR_INDONESIAN[code];
  if (indonesianMsg) {
    return {
      reason: indonesianMsg,
      detail: `${message}${details ? ` — Detail: ${details}` : ""}${hint ? ` — Hint: ${hint}` : ""}`,
      code: code,
    };
  }

  // Fallback for unknown codes
  return {
    reason: `Gagal menyimpan ke database (${code || "kode tidak dikenal"}).`,
    detail: `${message}${details ? ` — Detail: ${details}` : ""}${hint ? ` — Hint: ${hint}` : ""}`,
    code: code || "UNKNOWN",
  };
}
