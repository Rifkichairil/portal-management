"use client";

import { useState } from "react";
import {
  X, Building2, Loader2, CloudDownload, CheckCircle2, AlertCircle,
  Info, SearchX, WifiOff, KeyRound, Database, FileX
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

interface ImportSalesforceAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SalesforceAccountData {
  accountId?: string;
  name?: string;
  phone?: string;
  email?: string;
  website?: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingCountry?: string;
  billingPostalCode?: string;
  [key: string]: any;
}

interface ErrorInfo {
  code: string;
  title: string;
  message: string;
  icon: React.ReactNode;
  severity: "error" | "warning";
}

type Step = "form" | "fetching" | "review" | "inserting" | "done" | "error";

const ERROR_CATALOG: Record<string, (msg: string) => ErrorInfo> = {
  // Salesforce errors (SF-)
  "SF-001": (msg) => ({
    code: "SF-001",
    title: "Sesi Tidak Valid",
    message: msg || "Silakan login ulang untuk melanjutkan.",
    icon: <KeyRound className="w-8 h-8 text-red-500" />,
    severity: "error",
  }),
  "SF-002": (msg) => ({
    code: "SF-002",
    title: "Akses Ditolak",
    message: msg || "Hanya admin yang dapat melakukan sinkronasi Salesforce.",
    icon: <KeyRound className="w-8 h-8 text-red-500" />,
    severity: "error",
  }),
  "SF-003": (msg) => ({
    code: "SF-003",
    title: "ID Tidak Valid",
    message: msg || "Format Salesforce Account ID tidak valid.",
    icon: <FileX className="w-8 h-8 text-amber-500" />,
    severity: "warning",
  }),
  "SF-004": (msg) => ({
    code: "SF-004",
    title: "Konfigurasi Salesforce",
    message: msg || "Konfigurasi Salesforce belum lengkap. Hubungi administrator.",
    icon: <WifiOff className="w-8 h-8 text-red-500" />,
    severity: "error",
  }),
  "SF-005": (msg) => ({
    code: "SF-005",
    title: "Gagal Terhubung ke Salesforce",
    message: msg || "Tidak dapat terhubung ke Salesforce. Cek kredensial.",
    icon: <WifiOff className="w-8 h-8 text-red-500" />,
    severity: "error",
  }),
  "SF-006": (msg) => ({
    code: "SF-006",
    title: "Error dari Salesforce",
    message: msg || "Salesforce mengembalikan error. Coba lagi nanti.",
    icon: <AlertCircle className="w-8 h-8 text-red-500" />,
    severity: "error",
  }),
  "SF-007": (msg) => ({
    code: "SF-007",
    title: "Account Tidak Ditemukan",
    message: msg || "Account ID tidak ditemukan di Salesforce.",
    icon: <SearchX className="w-8 h-8 text-amber-500" />,
    severity: "warning",
  }),
  "SF-008": (msg) => ({
    code: "SF-008",
    title: "Kesalahan Server",
    message: msg || "Terjadi kesalahan internal. Silakan coba lagi.",
    icon: <AlertCircle className="w-8 h-8 text-red-500" />,
    severity: "error",
  }),

  // Database errors (DB-)
  "DB-001": (msg) => ({
    code: "DB-001",
    title: "Sesi Tidak Valid",
    message: msg || "Silakan login ulang untuk melanjutkan.",
    icon: <KeyRound className="w-8 h-8 text-red-500" />,
    severity: "error",
  }),
  "DB-002": (msg) => ({
    code: "DB-002",
    title: "Akses Ditolak",
    message: msg || "Hanya admin yang dapat menambahkan account.",
    icon: <KeyRound className="w-8 h-8 text-red-500" />,
    severity: "error",
  }),
  "DB-003": (msg) => ({
    code: "DB-003",
    title: "Data Tidak Lengkap",
    message: msg || "Field yang wajib diisi masih kosong.",
    icon: <FileX className="w-8 h-8 text-amber-500" />,
    severity: "warning",
  }),
  "DB-004": (msg) => ({
    code: "DB-004",
    title: "Account Sudah Ada",
    message: msg || "Account dengan Salesforce ID ini sudah ada di database.",
    icon: <Info className="w-8 h-8 text-amber-500" />,
    severity: "warning",
  }),
  "DB-005": (msg) => ({
    code: "DB-005",
    title: "Gagal Simpan ke Database",
    message: msg || "Terjadi error saat menyimpan data. Coba lagi.",
    icon: <Database className="w-8 h-8 text-red-500" />,
    severity: "error",
  }),
  "DB-006": (msg) => ({
    code: "DB-006",
    title: "Kesalahan Server",
    message: msg || "Terjadi kesalahan internal server. Silakan coba lagi.",
    icon: <AlertCircle className="w-8 h-8 text-red-500" />,
    severity: "error",
  }),
};

const DEFAULT_ERROR: ErrorInfo = {
  code: "ERR-000",
  title: "Terjadi Kesalahan",
  message: "Terjadi kesalahan yang tidak dikenal. Silakan coba lagi.",
  icon: <AlertCircle className="w-8 h-8 text-red-500" />,
  severity: "error",
};

function parseError(err: unknown): ErrorInfo {
  if (err instanceof Error) {
    // Try to parse JSON error from API response
    const msg = err.message;
    // Check if it looks like a JSON API error
    if (msg.startsWith("{") || msg.startsWith("[")) {
      try {
        const parsed = JSON.parse(msg);
        if (parsed.code && ERROR_CATALOG[parsed.code]) {
          return ERROR_CATALOG[parsed.code](parsed.message || parsed.error);
        }
        if (parsed.code) {
          return {
            ...DEFAULT_ERROR,
            code: parsed.code,
            message: parsed.message || parsed.error || msg,
          };
        }
      } catch {}
    }
    return { ...DEFAULT_ERROR, message: msg };
  }
  return DEFAULT_ERROR;
}

export default function ImportSalesforceAccountModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportSalesforceAccountModalProps) {
  const [sfId, setSfId] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [sfAccountData, setSfAccountData] = useState<SalesforceAccountData | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo>(DEFAULT_ERROR);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  if (!isOpen) return null;

  const handleFetch = async () => {
    const trimmedId = sfId.trim();
    if (!trimmedId) return;

    setStep("fetching");
    setErrorInfo(DEFAULT_ERROR);

    try {
      // Check if account ID already exists in Supabase
      const { data: existingAccount } = await supabase
        .from("account")
        .select("id, name, account_sf_id")
        .eq("account_sf_id", trimmedId)
        .maybeSingle();

      setDuplicateWarning(!!existingAccount);

      const res = await fetch(`/api/salesforce/account?id=${encodeURIComponent(trimmedId)}`);

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        const errMsg = errorBody.message || errorBody.error || `HTTP ${res.status}`;
        const errCode = errorBody.code || "SF-006";
        throw new Error(JSON.stringify({ code: errCode, message: errMsg, error: errorBody.error }));
      }

      const result = await res.json();

      if (result.data && result.data.length > 0) {
        setSfAccountData(result.data[0]);
        setStep("review");
      } else if (result.data && !Array.isArray(result.data)) {
        setSfAccountData(result.data);
        setStep("review");
      } else {
        throw new Error(JSON.stringify({
          code: "SF-007",
          message: `Account dengan ID "${trimmedId}" tidak ditemukan di Salesforce.`,
        }));
      }
    } catch (error: unknown) {
      setErrorInfo(parseError(error));
      setStep("error");
    }
  };

  const handleInsert = async () => {
    if (!sfAccountData) return;

    setStep("inserting");
    setErrorInfo(DEFAULT_ERROR);

    try {
      const payload: Record<string, any> = {
        name: sfAccountData.name || "",
        account_sf_id: sfAccountData.accountId || sfId.trim(),
      };
      if (sfAccountData.phone) payload.phone = sfAccountData.phone;
      if (sfAccountData.email) payload.email = sfAccountData.email;
      if (sfAccountData.website) payload.website = sfAccountData.website;
      if (sfAccountData.billingStreet) payload.billingStreet = sfAccountData.billingStreet;
      if (sfAccountData.billingCity) payload.billingCity = sfAccountData.billingCity;
      if (sfAccountData.billingState) payload.billingState = sfAccountData.billingState;
      if (sfAccountData.billingCountry) payload.billingCountry = sfAccountData.billingCountry;
      if (sfAccountData.billingPostalCode) payload.billingPostalCode = sfAccountData.billingPostalCode;

      const res = await fetch("/api/account/sync-salesforce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        const errMsg = errorBody.message || errorBody.error || `HTTP ${res.status}`;
        const errCode = errorBody.code || "DB-005";
        throw new Error(JSON.stringify({ code: errCode, message: errMsg, error: errorBody.error }));
      }

      setStep("done");
    } catch (error: unknown) {
      setErrorInfo(parseError(error));
      setStep("error");
    }
  };

  const handleClose = () => {
    setSfId("");
    setStep("form");
    setSfAccountData(null);
    setErrorInfo(DEFAULT_ERROR);
    setDuplicateWarning(false);
    onClose();
  };

  const handleDoneAndClose = () => {
    onSuccess();
    handleClose();
  };

  const formatFieldLabel = (key: string): string => {
    const labels: Record<string, string> = {
      accountId: "Salesforce ID",
      name: "Name",
      phone: "Phone",
      email: "Email",
      website: "Website",
      billingStreet: "Billing Street",
      billingCity: "Billing City",
      billingState: "Billing State",
      billingCountry: "Billing Country",
      billingPostalCode: "Billing Postal Code",
    };
    return labels[key] || key;
  };

  const accountFields: (keyof SalesforceAccountData)[] = [
    "accountId", "name", "phone", "email", "website",
    "billingStreet", "billingCity", "billingState", "billingCountry", "billingPostalCode",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <CloudDownload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 leading-tight">Sync from Salesforce</h3>
              <p className="text-xs text-slate-400">
                {step === "form" && "Enter a Salesforce Account ID to import"}
                {step === "fetching" && "Fetching account data..."}
                {step === "review" && "Review account data before saving"}
                {step === "inserting" && "Saving to database..."}
                {step === "done" && "Account imported successfully"}
                {step === "error" && "An error occurred"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={step === "fetching" || step === "inserting"}
            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Step: Form Input */}
          {step === "form" && (
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sfAccountId">Salesforce Account ID</Label>
                <Input
                  id="sfAccountId"
                  placeholder="Enter Salesforce Account ID (e.g., 001...)"
                  value={sfId}
                  onChange={(e) => setSfId(e.target.value)}
                  className="bg-slate-50 border-slate-200 font-mono"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleFetch();
                  }}
                />
                <p className="text-xs text-slate-400">
                  Enter the 15 or 18 character Salesforce Account ID to fetch account data.
                </p>
              </div>
            </div>
          )}

          {/* Step: Fetching */}
          {step === "fetching" && (
            <div className="p-6 flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-600">Fetching account from Salesforce...</p>
              <p className="text-xs text-slate-400 mt-1">This may take a few seconds.</p>
            </div>
          )}

          {/* Step: Review */}
          {step === "review" && sfAccountData && (
            <div className="p-6 space-y-4">
              {duplicateWarning && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Duplicate Warning</p>
                    <p className="text-xs text-amber-700 mt-1">
                      An account with this Salesforce ID already exists in the database. Saving again will create a duplicate entry.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                {accountFields.map((key) => {
                  const value = sfAccountData[key];
                  if (value === undefined || value === null || value === "") return null;
                  return (
                    <div key={key} className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          {formatFieldLabel(key)}
                        </div>
                        <div className="text-sm text-slate-800 mt-0.5 break-words">
                          {String(value)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step: Inserting */}
          {step === "inserting" && (
            <div className="p-6 flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-600">Saving account to database...</p>
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && (
            <div className="p-6 flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-lg font-bold text-slate-800">Account Imported!</p>
              <p className="text-sm text-slate-500 mt-1">
                {sfAccountData?.name || "Account"} has been added to the database.
              </p>
            </div>
          )}

          {/* Step: Error */}
          {step === "error" && (
            <div className="p-6 space-y-4">
              <div className="flex flex-col items-center justify-center py-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  errorInfo.severity === "warning" ? "bg-amber-100" : "bg-red-100"
                }`}>
                  {errorInfo.icon}
                </div>

                {/* Error Code Badge */}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold mb-2 ${
                  errorInfo.severity === "warning"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
                }`}>
                  {errorInfo.code}
                </span>

                <p className={`text-sm font-bold text-center ${
                  errorInfo.severity === "warning" ? "text-amber-800" : "text-red-700"
                }`}>
                  {errorInfo.title}
                </p>
                <p className={`text-xs text-center mt-1 max-w-sm ${
                  errorInfo.severity === "warning" ? "text-amber-600" : "text-red-500"
                }`}>
                  {errorInfo.message}
                </p>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep("form")}
                    className="bg-white"
                  >
                    Try Again
                  </Button>
                  {errorInfo.code === "SF-004" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClose}
                      className="bg-white"
                    >
                      Contact Admin
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
          {step === "form" && (
            <>
              <Button variant="outline" onClick={handleClose} className="bg-white border-slate-200">
                Cancel
              </Button>
              <Button
                onClick={handleFetch}
                disabled={!sfId.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <CloudDownload className="w-4 h-4 mr-2" />
                Fetch from Salesforce
              </Button>
            </>
          )}

          {step === "review" && (
            <>
              <Button variant="outline" onClick={() => setStep("form")} className="bg-white border-slate-200">
                Back
              </Button>
              <Button
                onClick={handleInsert}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Save to Database
              </Button>
            </>
          )}

          {step === "done" && (
            <Button onClick={handleDoneAndClose} className="bg-blue-600 hover:bg-blue-700">
              Done
            </Button>
          )}

          {step === "error" && (
            <Button variant="outline" onClick={handleClose} className="bg-white border-slate-200">
              Close
            </Button>
          )}

          {step === "fetching" || step === "inserting" ? null : null}
        </div>
      </div>
    </div>
  );
}
