"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import { AlertCircle, Calendar, User, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorLogPage() {
  const { user, isAdmin, isLoading } = useUser();
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  useEffect(() => {
    console.log("Error Log Page - isAdmin:", isAdmin, "isLoading:", isLoading, "user role:", user?.role);
    if (!isLoading && !isAdmin) {
      window.location.href = "/dashboard/case";
    }
  }, [isAdmin, isLoading, user]);

  useEffect(() => {
    async function fetchErrorLogs() {
      if (!isAdmin) return;
      setIsLoadingLogs(true);
      try {
        const res = await fetch("/api/error-log");
        if (res.ok) {
          const json = await res.json();
          setErrorLogs(json.errorLogs || []);
        }
      } catch (error) {
        console.error("Error fetching error logs:", error);
      } finally {
        setIsLoadingLogs(false);
      }
    }
    if (!isLoading && isAdmin) {
      fetchErrorLogs();
    }
  }, [isLoading, isAdmin]);

  if (isLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-500 font-medium">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Error Log</h1>
        <p className="text-sm text-slate-500 mt-1">View system errors and Salesforce sync issues.</p>
      </div>

      {/* Error Logs Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        {isLoadingLogs ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-slate-500">Loading error logs...</div>
          </div>
        ) : errorLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500">No error logs found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="font-semibold py-3 px-4 uppercase tracking-wider text-xs">Type</th>
                  <th className="font-semibold py-3 px-4 uppercase tracking-wider text-xs">Message</th>
                  <th className="font-semibold py-3 px-4 uppercase tracking-wider text-xs">Case</th>
                  <th className="font-semibold py-3 px-4 uppercase tracking-wider text-xs">User</th>
                  <th className="font-semibold py-3 px-4 uppercase tracking-wider text-xs">Date</th>
                  <th className="font-semibold py-3 px-4 uppercase tracking-wider text-xs">Action</th>
                </tr>
              </thead>
              <tbody>
                {errorLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        {log.error_type}
                      </span>
                    </td>
                    <td className="py-4 px-4 max-w-md truncate text-slate-700">
                      {log.error_message}
                    </td>
                    <td className="py-4 px-4">
                      {log.case ? (
                        <div>
                          <div className="font-medium text-slate-700">{log.case.caseNumber}</div>
                          <div className="text-xs text-slate-500 truncate max-w-[150px]">{log.case.subject}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {log.user ? (
                        <div>
                          <div className="font-medium text-slate-700">{log.user.username}</div>
                          <div className="text-xs text-slate-500 truncate max-w-[150px]">{log.user.email}</div>
                        </div>
      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Error Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Error Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Error Type</label>
                <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                    {selectedLog.error_type}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Error Message</label>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-700">{selectedLog.error_message}</p>
                </div>
              </div>

              {selectedLog.error_details && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Error Details</label>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <pre className="text-sm text-slate-700 whitespace-pre-wrap">{selectedLog.error_details}</pre>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    Case
                  </label>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    {selectedLog.case ? (
                      <div>
                        <div className="font-medium text-slate-700">{selectedLog.case.caseNumber}</div>
                        <div className="text-xs text-slate-500">{selectedLog.case.subject}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    User
                  </label>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    {selectedLog.user ? (
                      <div>
                        <div className="font-medium text-slate-700">{selectedLog.user.username}</div>
                        <div className="text-xs text-slate-500">{selectedLog.user.email}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Created At
                </label>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-700">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 flex justify-end rounded-b-2xl border-t border-slate-100">
              <Button
                variant="outline"
                className="bg-white border-slate-200 text-slate-700"
                onClick={() => setSelectedLog(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
