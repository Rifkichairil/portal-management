"use client";

import { useState, useEffect } from "react";
import {
  X, Loader2, CloudDownload, CheckCircle2, AlertCircle,
  CalendarDays, Building2, Info, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

interface ImportSalesforceCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface AccountOption {
  id: string;
  account_sf_id: string;
  name: string;
}

interface SalesforceCase {
  caseId: string;
  caseNumber: string;
  subject: string;
  status: string;
  severity?: string;
  description?: string;
  submitterBy?: string;
}

interface SyncResult {
  total: number;
  new: number;
  skipped: number;
  newCases: SalesforceCase[];
  skippedCases: { caseId: string; caseNumber: string }[];
}

type Step = "form" | "fetching" | "review" | "inserting" | "done" | "error";

export default function ImportSalesforceCaseModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportSalesforceCaseModalProps) {
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [errorInfo, setErrorInfo] = useState<{ title: string; message: string; code?: string; detail?: string }>({ title: "", message: "" });

  // Fetch accounts from Supabase when modal opens
  useEffect(() => {
    if (!isOpen) return;
    async function fetchAccounts() {
      const { data, error } = await supabase
        .from("account")
        .select("id, account_sf_id, name")
        .not("account_sf_id", "is", null)
        .order("name");
      if (!error && data) {
        setAccounts(data);
      }
    }
    fetchAccounts();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFetch = async () => {
    const account = accounts.find((a) => a.id === selectedAccountId);
    if (!account || !account.account_sf_id || !startDate || !endDate) return;

    setStep("fetching");
    setErrorInfo({ title: "", message: "" });

    try {
      const account = accounts.find((a) => a.id === selectedAccountId);
      const res = await fetch(
        `/api/salesforce/case/sync?accountId=${encodeURIComponent(account!.account_sf_id)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || `HTTP ${res.status}`);
      }

      const result = await res.json();

      if (result.code !== "SCS-OK" || !result.data) {
        throw new Error("Gagal mendapatkan data dari Salesforce");
      }

      setSyncResult(result.data);
      if (result.data.new === 0) {
        // No new cases, show done directly
        setStep("done");
      } else {
        setStep("review");
      }
    } catch (error: any) {
      const message = error?.message || error?.error || "Terjadi kesalahan";
      const detail = error?.detail || "";
      setErrorInfo({ title: "Gagal Fetch Data", message, detail });
      setStep("error");
    }
  };

  const handleImport = async () => {
    if (!syncResult?.newCases || syncResult.newCases.length === 0) return;

    setStep("inserting");
    setErrorInfo({ title: "", message: "" });

    try {
      const res = await fetch("/api/salesforce/case/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cases: syncResult.newCases }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || "Gagal import");
      }

      const result = await res.json();

      // Update sync result with actual inserted count
      if (syncResult) {
        setSyncResult({
          ...syncResult,
          new: result.inserted || 0,
          skipped: (syncResult.skipped || 0) + (syncResult.newCases.length - (result.inserted || 0)),
        });
      }

      setStep("done");
    } catch (error: any) {
      const message = error?.message || error?.error || "Terjadi kesalahan";
      const detail = error?.detail || "";
      setErrorInfo({ title: "Gagal Import", message, detail });
      setStep("error");
    }
  };

  const handleClose = () => {
    setSelectedAccountId("");
    setStartDate("");
    setEndDate("");
    setStep("form");
    setSyncResult(null);
    setErrorInfo({ title: "", message: "" });
    setAccounts([]);
    onClose();
  };

  const handleDoneAndClose = () => {
    onSuccess();
    handleClose();
  };

  // --- Render helpers ---

  const severityBadge = (severity?: string) => {
    if (!severity) return null;
    const colors: Record<string, string> = {
      "Severity 1": "bg-red-100 text-red-700",
      "Severity 2": "bg-amber-100 text-amber-700",
      "Severity 3": "bg-yellow-100 text-yellow-700",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors[severity] || "bg-slate-100 text-slate-600"}`}>
        {severity}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <CloudDownload className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 leading-tight">Sync Cases from Salesforce</h3>
              <p className="text-xs text-slate-400">
                {step === "form" && "Import cases by Account ID and date range"}
                {step === "fetching" && "Fetching cases..."}
                {step === "review" && "Review new cases before importing"}
                {step === "inserting" && "Importing cases..."}
                {step === "done" && syncResult?.new === 0 ? "No new cases" : "Import complete"}
                {step === "error" && "An error occurred"}
              </p>
            </div>
          </div>
          <button onClick={handleClose} disabled={step === "fetching" || step === "inserting"}
            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Step: Form */}
          {step === "form" && (
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="accountSelect">Account</Label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                  <select
                    id="accountSelect"
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                  >
                    <option value="">Select an account...</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.account_sf_id})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <div className="relative">
                    <CalendarDays className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="pl-9 bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <div className="relative">
                    <CalendarDays className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="pl-9 bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Only cases that are not yet in the database will be imported. Existing cases (matched by Salesforce ID) will be skipped automatically.
                </p>
              </div>
            </div>
          )}

          {/* Step: Fetching */}
          {step === "fetching" && (
            <div className="p-6 flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-600">Fetching cases from Salesforce...</p>
            </div>
          )}

          {/* Step: Review */}
          {step === "review" && syncResult && (
            <div className="p-6 space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-slate-800">{syncResult.total}</div>
                  <div className="text-xs text-slate-500 mt-1">Total Cases</div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{syncResult.new}</div>
                  <div className="text-xs text-emerald-600 mt-1">New to Import</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-slate-400">{syncResult.skipped}</div>
                  <div className="text-xs text-slate-500 mt-1">Skipped (Exist)</div>
                </div>
              </div>

              {/* New Cases List */}
              {syncResult.newCases.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">New Cases ({syncResult.newCases.length})</p>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {syncResult.newCases.map((c) => (
                      <div key={c.caseId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{c.subject}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{c.caseNumber || c.caseId}</div>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          {severityBadge(c.severity)}
                          <span className="text-xs text-slate-500">{c.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skipped List */}
              {syncResult.skippedCases.length > 0 && (
                <details className="text-xs text-slate-500">
                  <summary className="cursor-pointer hover:text-slate-700 font-medium">
                    {syncResult.skippedCases.length} existing case(s) skipped
                  </summary>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    {syncResult.skippedCases.map((s) => (
                      <li key={s.caseId}>{s.caseNumber || s.caseId}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {/* Step: Inserting */}
          {step === "inserting" && (
            <div className="p-6 flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-600">Importing cases to database...</p>
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && syncResult && (
            <div className="p-6 flex flex-col items-center justify-center py-12">
              {syncResult.new > 0 ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <p className="text-lg font-bold text-slate-800">Import Complete!</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {syncResult.new} case(s) imported, {syncResult.skipped} skipped (already exist).
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                    <Info className="w-8 h-8 text-blue-500" />
                  </div>
                  <p className="text-lg font-bold text-slate-800">No New Cases</p>
                  <p className="text-sm text-slate-500 mt-1">
                    All {syncResult.total} case(s) already exist in the database.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Step: Error */}
          {step === "error" && errorInfo.title && (
            <div className="p-6">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-sm font-bold text-red-700 text-center">{errorInfo.title}</p>
                <p className="text-xs text-red-500 text-center mt-1 max-w-sm">{errorInfo.message}</p>
                {errorInfo.detail && (
                  <p className="text-xs text-slate-400 text-center mt-2 max-w-sm bg-slate-50 rounded-lg p-2 whitespace-pre-wrap">{errorInfo.detail}</p>
                )}
                <Button variant="outline" size="sm" onClick={() => setStep("form")} className="mt-4 bg-white">
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
          {step === "form" && (
            <>
              <Button variant="outline" onClick={handleClose} className="bg-white border-slate-200">Cancel</Button>
              <Button onClick={handleFetch} disabled={!selectedAccountId || !startDate || !endDate}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                <CloudDownload className="w-4 h-4 mr-2" /> Fetch from Salesforce
              </Button>
            </>
          )}

          {step === "review" && (
            <>
              <Button variant="outline" onClick={() => setStep("form")} className="bg-white border-slate-200">Back</Button>
              <Button onClick={handleImport} disabled={!syncResult || syncResult.new === 0}
                className="bg-indigo-600 hover:bg-indigo-700">
                <CloudDownload className="w-4 h-4 mr-2" /> Import {syncResult?.new || 0} Case(s)
              </Button>
            </>
          )}

          {step === "done" && (
            <Button onClick={handleDoneAndClose} className="bg-indigo-600 hover:bg-indigo-700">Done</Button>
          )}

          {step === "error" && (
            <Button variant="outline" onClick={handleClose} className="bg-white border-slate-200">Close</Button>
          )}
        </div>
      </div>
    </div>
  );
}
