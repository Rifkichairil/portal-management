"use client";

import { useState, useEffect } from "react";
import {
  X, Loader2, CloudDownload, SearchX,
  AlertCircle, Users, Mail, Phone, Shield,
  CheckCircle2, Database, SaveAll, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

interface SfContactPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Account {
  id: string;
  account_sf_id: string;
  name: string;
}

interface SfContactData {
  contactId: string;
  fullName: string;
  firstName: string | null;
  lastName: string;
  email: string;
  phone: string | null;
  mobilePhone: string | null;
  password: string;
  title: string | null;
  role: string | null;
  department: string | null;
  accountName: string;
}

interface SavingState {
  status: "idle" | "saving" | "saved" | "skipped" | "error";
  message?: string;
}

type Step = "form" | "fetching" | "results" | "error";

export default function SfContactPasswordModal({
  isOpen,
  onClose,
  onSuccess,
}: SfContactPasswordModalProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [contacts, setContacts] = useState<SfContactData[]>([]);
  const [accountName, setAccountName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [errorDetail, setErrorDetail] = useState("");
  const [savingStates, setSavingStates] = useState<Record<string, SavingState>>({});

  useEffect(() => {
    if (!isOpen) return;
    async function fetchAccounts() {
      setIsLoadingAccounts(true);
      const { data, error } = await supabase
        .from("account")
        .select("id, account_sf_id, name")
        .not("account_sf_id", "is", null)
        .order("name");
      if (!error && data) {
        setAccounts(data);
      }
      setIsLoadingAccounts(false);
    }
    fetchAccounts();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFetch = async () => {
    const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
    if (!selectedAccount?.account_sf_id) return;

    const trimmedId = selectedAccount.account_sf_id;

    setStep("fetching");
    setErrorMessage("");
    setErrorCode("");
    setErrorDetail("");

    try {
      const res = await fetch(
        `/api/salesforce/contact-password?accountId=${encodeURIComponent(trimmedId)}`
      );

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw {
          code: errorBody.code || "SFCP-006",
          message: errorBody.message || errorBody.error || `HTTP ${res.status}`,
        };
      }

      const result = await res.json();

      if (result.status_code === 200 && Array.isArray(result.data)) {
        setContacts(result.data);
        setAccountName(result.data[0]?.accountName || "");
        setSavingStates({});
        setStep("results");
      } else {
        throw {
          code: "SFCP-006",
          message: "Format response tidak sesuai dari Salesforce.",
        };
      }
    } catch (error: any) {
      setErrorCode(error.code || "ERR-000");
      setErrorMessage(error.message || error.error || "Terjadi kesalahan yang tidak dikenal.");
      setErrorDetail(error.detail || "");
      setStep("error");
    }
  };

  const handleSave = async (contact: SfContactData) => {
    if (!contact.email) {
      setSavingStates((prev) => ({
        ...prev,
        [contact.contactId]: { status: "error", message: "Email tidak tersedia" },
      }));
      return;
    }

    const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
    const sfAccountId = selectedAccount?.account_sf_id || "";

    if (!sfAccountId) {
      setSavingStates((prev) => ({
        ...prev,
        [contact.contactId]: { status: "error", message: "Account ID tidak valid" },
      }));
      return;
    }

    setSavingStates((prev) => ({
      ...prev,
      [contact.contactId]: { status: "saving" },
    }));

    try {
      const res = await fetch("/api/salesforce/contact-password/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactData: contact,
          accountSfId: sfAccountId,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw {
          message: result.message || result.error || `HTTP ${res.status}`,
          detail: result.detail || "",
        };
      }

      const status = result.skipped ? "skipped" : "saved";
      setSavingStates((prev) => ({
        ...prev,
        [contact.contactId]: { status, message: result.message },
      }));
      onSuccess?.();
    } catch (error: any) {
      setSavingStates((prev) => ({
        ...prev,
        [contact.contactId]: { status: "error", message: error.message || "Terjadi kesalahan" },
      }));
    }
  };

  const handleSaveAll = async () => {
    const unsavedContacts = contacts.filter(
      (c) => savingStates[c.contactId]?.status !== "saved" && savingStates[c.contactId]?.status !== "skipped"
    );

    for (const contact of unsavedContacts) {
      await handleSave(contact);
    }
  };

  const handleClose = () => {
    setSelectedAccountId("");
    setStep("form");
    setContacts([]);
    setAccountName("");
    setErrorMessage("");
    setErrorCode("");
    setErrorDetail("");
    setSavingStates({});
    onClose();
  };

  const maskPassword = (pw: string) => {
    if (!pw) return "";
    if (pw.length <= 2) return "***";
    return pw[0] + "***" + pw[pw.length - 1];
  };

  const getSaveCounts = () => {
    const total = contacts.length;
    const done = contacts.filter(
      (c) => savingStates[c.contactId]?.status === "saved" || savingStates[c.contactId]?.status === "skipped"
    ).length;
    return { total, done };
  };

  const isSavingAny = Object.values(savingStates).some((s) => s.status === "saving");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <CloudDownload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 leading-tight">
                Sync Contacts from Salesforce
              </h3>
              <p className="text-xs text-slate-400">
                {step === "form" && "Enter a Salesforce Account ID to fetch contacts with passwords"}
                {step === "fetching" && "Fetching contacts from Salesforce..."}
                {step === "results" && `${getSaveCounts().done}/${getSaveCounts().total} saved${accountName ? ` - ${accountName}` : ""}`}
                {step === "error" && "An error occurred"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={step === "fetching" || isSavingAny}
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
                <Label htmlFor="sfAccount">Pilih Account</Label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    id="sfAccount"
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    disabled={isLoadingAccounts}
                    className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:opacity-50"
                  >
                    <option value="">Pilih account...</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.account_sf_id})
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-slate-400">
                  Pilih account untuk mengambil data contacts yang memiliki password dari Salesforce.
                </p>
              </div>
            </div>
          )}

          {/* Step: Fetching */}
          {step === "fetching" && (
            <div className="p-6 flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-600">Fetching contacts from Salesforce...</p>
              <p className="text-xs text-slate-400 mt-1">This may take a few seconds.</p>
            </div>
          )}

          {/* Step: Results */}
          {step === "results" && (
            <div className="p-6">
              {contacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <SearchX className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-sm font-medium text-slate-600">No contacts found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    No contacts with passwords found for this Account ID.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-100 bg-slate-50">
                        <th className="font-semibold py-3 px-4">Contact Info</th>
                        <th className="font-semibold py-3 px-4">Email &amp; Phone</th>
                        <th className="font-semibold py-3 px-4">Password</th>
                        <th className="font-semibold py-3 px-4 text-center w-32">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((contact) => {
                        const sState = savingStates[contact.contactId] || { status: "idle" };
                        return (
                          <tr
                            key={contact.contactId}
                            className={`border-b border-slate-50 hover:bg-slate-50/80 transition-colors ${
                              sState.status === "saved" ? "bg-emerald-50/50" : ""
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                  <Users className="w-4 h-4 text-slate-500" />
                                </div>
                                <div>
                                  <div className="font-medium text-slate-800 text-sm">
                                    {contact.fullName || `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Unknown"}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    {contact.contactId}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  <span className="truncate max-w-[200px]" title={contact.email}>
                                    {contact.email || "-"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{contact.phone || contact.mobilePhone || "-"}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                <code className="text-xs font-mono bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
                                  {maskPassword(contact.password)}
                                </code>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {sState.status === "saved" ? (
                                <div className="flex items-center justify-center gap-1.5 text-emerald-600 text-xs font-medium">
                                  <CheckCircle2 className="w-4 h-4" />
                                  Saved
                                </div>
                              ) : sState.status === "skipped" ? (
                                <div className="flex items-center justify-center gap-1.5 text-amber-600 text-xs font-medium">
                                  <AlertCircle className="w-4 h-4" />
                                  Skipped
                                </div>
                              ) : sState.status === "saving" ? (
                                <Loader2 className="w-4 h-4 text-blue-500 animate-spin mx-auto" />
                              ) : sState.status === "error" ? (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-xs text-red-500 font-medium">Failed</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleSave(contact)}
                                  >
                                    Retry
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs bg-white border-slate-200 text-slate-700"
                                  onClick={() => handleSave(contact)}
                                >
                                  <Database className="w-3.5 h-3.5 mr-1" />
                                  Save
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Step: Error */}
          {step === "error" && (
            <div className="p-6 space-y-4">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>

                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold mb-2 bg-red-100 text-red-700">
                  {errorCode}
                </span>

                <p className="text-sm font-bold text-center text-red-700">
                  Gagal Mengambil Data
                </p>
                <p className="text-xs text-center mt-1 max-w-sm text-red-500">
                  {errorMessage}
                </p>
                {errorDetail && (
                  <p className="text-xs text-slate-400 text-center mt-2 max-w-sm bg-slate-50 rounded-lg p-2 whitespace-pre-wrap">
                    {errorDetail}
                  </p>
                )}

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep("form")}
                    className="bg-white"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 flex justify-between items-center border-t border-slate-100">
          {step === "form" && (
            <>
              <div />
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="bg-white border-slate-200">
                  Cancel
                </Button>
                <Button
                  onClick={handleFetch}
                  disabled={!selectedAccountId}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  <CloudDownload className="w-4 h-4 mr-2" />
                  Fetch from Salesforce
                </Button>
              </div>
            </>
          )}

          {step === "results" && (
            <>
              <div className="text-xs text-slate-400">
                {getSaveCounts().done}/{getSaveCounts().total} contacts saved
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="bg-white border-slate-200" disabled={isSavingAny}>
                  Close
                </Button>
                {getSaveCounts().done < getSaveCounts().total && (
                  <Button
                    onClick={handleSaveAll}
                    disabled={isSavingAny}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isSavingAny ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      <><SaveAll className="w-4 h-4 mr-2" /> Save All ({getSaveCounts().total - getSaveCounts().done})</>
                    )}
                  </Button>
                )}
                {getSaveCounts().done === getSaveCounts().total && getSaveCounts().total > 0 && (
                  <Button onClick={handleClose} className="bg-blue-600 hover:bg-blue-700">
                    Done
                  </Button>
                )}
              </div>
            </>
          )}

          {step === "error" && (
            <>
              <div />
              <Button variant="outline" onClick={handleClose} className="bg-white border-slate-200">
                Close
              </Button>
            </>
          )}

          {step === "fetching" ? null : null}
        </div>
      </div>
    </div>
  );
}
