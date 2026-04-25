"use client";

import { useState, useEffect } from "react";
import { Save, Key, Hash, Cloud, CloudOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/lib/user-context";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

export default function SettingsPage() {
  const { isAdmin, isLoading } = useUser();
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [salesforceEnabled, setSalesforceEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace("/dashboard/case");
    }
  }, [isAdmin, isLoading, router]);

  // Fetch current settings on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const json = await res.json();
          if (json.settings) {
            setClientId(json.settings.client_id || "");
            setClientSecret(json.settings.client_secret || "");
            setSalesforceEnabled(json.settings.salesforce_enabled ?? false);
          }
        }
      } catch {
        // ignore
      } finally {
        setIsFetching(false);
      }
    }
    if (!isLoading && isAdmin) {
      fetchSettings();
    }
  }, [isLoading, isAdmin]);

  if (isLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-500 font-medium">Loading...</div>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          salesforce_enabled: salesforceEnabled,
        }),
      });
      if (res.ok) {
        setSaveStatus("success");
        toast.success("Settings saved successfully!");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
        toast.error("Failed to save settings.");
      }
    } catch {
      setSaveStatus("error");
      toast.error("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSalesforce = () => {
    if (!salesforceEnabled) {
      const hasClientId = clientId.trim().length > 0;
      const hasClientSecret = clientSecret.trim().length > 0;

      if (!hasClientId || !hasClientSecret) {
        toast.error("Fill API credentials before enabling Salesforce.");
        return;
      }
    }

    setSalesforceEnabled((v) => !v);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage application settings and API credentials.</p>
        </div>
      </div>

      {isFetching ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* Salesforce Integration Toggle */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">Salesforce Integration</h2>
              <p className="text-sm text-slate-500 mt-1">
                Control whether new cases are pushed to Salesforce before being saved.
              </p>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between max-w-xl">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl transition-colors ${salesforceEnabled ? "bg-blue-100" : "bg-slate-100"}`}>
                    {salesforceEnabled ? (
                      <Cloud className="w-5 h-5 text-blue-600" />
                    ) : (
                      <CloudOff className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Insert to Salesforce
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {salesforceEnabled
                        ? "Cases will be created in Salesforce first. The case number and SF ID will come from Salesforce."
                        : "Cases will be saved without Salesforce synchronization."}
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={salesforceEnabled}
                  onClick={handleToggleSalesforce}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    salesforceEnabled ? "bg-blue-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      salesforceEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Status Badge */}
              <div className="mt-4 max-w-xl">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    salesforceEnabled
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      salesforceEnabled ? "bg-blue-500" : "bg-slate-400"
                    }`}
                  />
                  {salesforceEnabled ? "Salesforce Enabled" : "Salesforce Disabled"}
                </span>
              </div>
            </div>
          </div>

          {/* API Credentials */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">API Credentials</h2>
              <p className="text-sm text-slate-500 mt-1">
                Configure your Salesforce API Client ID and Secret to allow data synchronization.
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2 max-w-xl">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-slate-400" />
                  Client ID
                </label>
                <Input
                  placeholder="Enter your Client ID"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="bg-slate-50 border-slate-200 focus-visible:ring-blue-500"
                />
                <p className="text-xs text-slate-500">The public identifier for your application.</p>
              </div>

              <div className="space-y-2 max-w-xl">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Key className="w-4 h-4 text-slate-400" />
                  Client Secret
                </label>
                <Input
                  type="password"
                  placeholder="Enter your Client Secret"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="bg-slate-50 border-slate-200 focus-visible:ring-blue-500"
                />
                <p className="text-xs text-slate-500">Keep this secret safe. It is used to authenticate your application.</p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 flex justify-between items-center gap-3 border-t border-slate-100">
              {saveStatus === "success" && (
                <span className="text-sm text-emerald-600 font-medium">✓ Settings saved successfully!</span>
              )}
              {saveStatus === "error" && (
                <span className="text-sm text-red-500 font-medium">✗ Failed to save. Please try again.</span>
              )}
              {saveStatus === "idle" && <div />}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="bg-white border-slate-200 text-slate-700"
                  onClick={() => {
                    setClientId("");
                    setClientSecret("");
                  }}
                >
                  Clear
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold border-0"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Save Settings</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
