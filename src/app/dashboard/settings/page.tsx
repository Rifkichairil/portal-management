"use client";

import { useState } from "react";
import { Save, Key, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/lib/user-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
  const { isAdmin, isLoading } = useUser();
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace('/dashboard/case');
    }
  }, [isAdmin, isLoading, router]);

  if (isLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-500 font-medium">Loading...</div>
      </div>
    );
  }

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      alert("Settings saved successfully!");
    }, 1000);
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">API Credentials</h2>
          <p className="text-sm text-slate-500 mt-1">Configure your Salesforce API Client ID and Secret to allow data synchronization.</p>
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

        <div className="p-6 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
          <Button 
            variant="outline" 
            className="bg-white border-slate-200 text-slate-700"
            onClick={() => {
              setClientId("");
              setClientSecret("");
            }}
          >
            Cancel
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold border-0"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" /> 
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
