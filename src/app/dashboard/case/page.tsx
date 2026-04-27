"use client";

import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import { Pagination } from "@/components/ui/pagination";
import { 
  Search, 
  Filter, 
  CalendarDays,
  Plus,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  X,
  Upload,
  Eye,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

// Mock data
const caseStats = [
  { title: "New", count: 12, trend: "+7.4%", isPositive: true, icon: Briefcase },
  { title: "Open", count: 24, trend: "+2%", isPositive: true, icon: Clock },
  { title: "In Progress", count: 18, trend: "+3.5%", isPositive: true, icon: ArrowUpRight },
  { title: "Escalated", count: 4, trend: "-1.2%", isPositive: false, icon: ShieldAlert },
  { title: "Solved", count: 45, trend: "+12%", isPositive: true, icon: CheckCircle2 },
  { title: "Closed", count: 112, trend: "+4.1%", isPositive: true, icon: AlertCircle },
];

// Note: mockCases removed, data fetched from Supabase
const ITEMS_PER_PAGE = 10;

const statusStyles: Record<string, string> = {
  "New": "bg-blue-100 text-blue-700",
  "Open": "bg-amber-100 text-amber-700",
  "In progress": "bg-indigo-100 text-indigo-700",
  "Escalated": "bg-rose-100 text-rose-700",
  "Solved": "bg-emerald-100 text-emerald-700",
  "Closed": "bg-slate-100 text-slate-700",
};

type DateFilter = "All" | "This week" | "This month" | "This year";

type CaseRow = {
  id: string;
  realId: string;
  subject: string;
  status: string;
  date: string;
  rawDate: Date;
  client: {
    name: string;
    email: string;
  };
  contactSfId: string;
};

export default function CaseDashboardPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<DateFilter>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { user, isAdmin, isManager, isSubmitter } = useUser();

  // Modal State
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [newCaseSubject, setNewCaseSubject] = useState("");
  const [newCaseDescription, setNewCaseDescription] = useState("");
  const [newCaseImages, setNewCaseImages] = useState<Array<{ fileName: string; base64Data: string }>>([]);
  const [isSubmittingCase, setIsSubmittingCase] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);


  useEffect(() => {
    async function fetchCases() {
      if (!user) return;
      setIsLoading(true);

      let query = supabase
        .from('case')
        .select(`
          id,
          caseNumber,
          subject,
          status,
          created_at,
          contact_sf_id,
          contact:contact_sf_id (
            fullName,
            account:account_id (
              name,
              email
            )
          )
        `);

      // Manager: see all cases from contacts under the same account
      if (isManager && user.account_sf_id) {
        const { data: accountContacts } = await supabase
          .from('contact')
          .select('contact_sf_id')
          .eq('account_sf_id', user.account_sf_id);
        const sfIds = (accountContacts || []).map((c: any) => c.contact_sf_id).filter(Boolean);
        if (sfIds.length > 0) {
          query = (query as any).in('contact_sf_id', sfIds);
        } else {
          setCases([]);
          setIsLoading(false);
          return;
        }
      }

      // Submitter: only see their own cases (cannot see other submitters' cases)
      if (isSubmitter && user.contact_sf_id) {
        query = (query as any).eq('contact_sf_id', user.contact_sf_id);
      } else if (isSubmitter && !user.contact_sf_id) {
        setCases([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching cases:", error);
      } else if (data) {
        const mappedCases = data.map((item: any) => {
          const contact = Array.isArray(item.contact) ? item.contact[0] : item.contact;
          const account = contact && Array.isArray(contact.account) ? contact.account[0] : contact?.account;
          return {
            id: item.caseNumber,
            realId: item.id,
            subject: item.subject,
            status: item.status,
            date: new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            rawDate: new Date(item.created_at),
            client: { 
              name: contact?.fullName || "Unknown Client", 
              email: account?.email || "N/A" 
            },
            contactSfId: item.contact_sf_id || "N/A"
          };
        });
        setCases(mappedCases);
      }
      setIsLoading(false);
    }
    fetchCases();
  }, [user, isManager, isSubmitter, refreshTrigger]);

  const handleSubmitCase = async () => {
    if (!newCaseSubject.trim()) {
      setSubmitError("Subject is required.");
      return;
    }
    setIsSubmittingCase(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: newCaseSubject.trim(),
          description: newCaseDescription.trim(),
          images: newCaseImages,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsNewCaseModalOpen(false);
        setNewCaseSubject("");
        setNewCaseDescription("");
        setNewCaseImages([]);
        setSubmitError(null);
        // Trigger re-fetch
        setRefreshTrigger((t) => t + 1);

        toast.success(`Case ${data.case.caseNumber} created successfully!`);
        // Redirect using case_sf_id if available, otherwise use caseNumber
        const redirectId = data.case.case_sf_id || data.case.caseNumber;
        router.push(`/dashboard/case/${redirectId}`);
      } else {
        const json = await res.json();
        const errMsg = json.error || "Failed to create case.";
        setSubmitError(errMsg);
        toast.error(errMsg);
      }
    } catch {
      const errMsg = "Network error. Please try again.";
      setSubmitError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmittingCase(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: Array<{ fileName: string; base64Data: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await fileToBase64(file);
      newImages.push({
        fileName: file.name,
        base64Data: base64,
      });
    }

    setNewCaseImages([...newCaseImages, ...newImages]);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const removeImage = (index: number) => {
    setNewCaseImages(newCaseImages.filter((_, i) => i !== index));
  };

  const dateFilteredCases = useMemo(() => {
    const now = new Date();
    const startOfCurrentWeek = new Date(now);
    startOfCurrentWeek.setHours(0, 0, 0, 0);
    startOfCurrentWeek.setDate(now.getDate() - now.getDay());
    const startOfNextWeek = new Date(startOfCurrentWeek);
    startOfNextWeek.setDate(startOfCurrentWeek.getDate() + 7);
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return cases.filter((caseItem) => {
      const caseDate = caseItem.rawDate;

      if (Number.isNaN(caseDate.getTime())) {
        return false;
      }

      if (dateFilter === "This week") {
        return caseDate >= startOfCurrentWeek && caseDate < startOfNextWeek;
      }

      if (dateFilter === "This month") {
        return caseDate >= startOfCurrentMonth && caseDate < startOfNextMonth;
      }

      if (dateFilter === "This year") {
        return caseDate.getFullYear() === now.getFullYear();
      }

      return true;
    });
  }, [dateFilter, cases]);

  const filteredCases = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return dateFilteredCases.filter((caseItem) => {
      const matchesStatus = statusFilter === "All" || caseItem.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearchTerm) {
        return true;
      }

      return [caseItem.id, caseItem.subject].some((field) =>
        field.toLowerCase().includes(normalizedSearchTerm)
      );
    });
  }, [dateFilteredCases, searchTerm, statusFilter]);

  const dynamicCaseStats = useMemo(
    () =>
      caseStats.map((stat) => ({
        ...stat,
        count: dateFilteredCases.filter((caseItem) =>
          caseItem.status.toLowerCase() === stat.title.toLowerCase()
        ).length,
      })),
    [dateFilteredCases]
  );

  const totalPages = Math.ceil(filteredCases.length / ITEMS_PER_PAGE);
  const effectivePage = totalPages === 0 ? 1 : Math.min(currentPage, totalPages);
  const currentCases = useMemo(() => {
    const startIdx = (effectivePage - 1) * ITEMS_PER_PAGE;
    return filteredCases.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [effectivePage, filteredCases]);

  const statusFilterOptions = ["All", ...Object.keys(statusStyles)];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Case Management</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <CalendarDays className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              className="h-9 rounded-md border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value as DateFilter);
                setCurrentPage(1);
              }}
              aria-label="Filter by date range"
            >
              <option value="All">All time</option>
              <option value="This week">This week</option>
              <option value="This month">This month</option>
              <option value="This year">This year</option>
            </select>
          </div>
          {/* Show New Case only for manager and submitter, NOT admin */}
          {(isManager || isSubmitter) && (
            <Button 
              className="bg-amber-200 hover:bg-amber-300 text-amber-900 font-semibold shadow-none border-0"
              onClick={() => setIsNewCaseModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" /> New Case
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {dynamicCaseStats.map((stat) => (
          <div
            key={`${stat.title}-${dateFilter}`}
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center gap-2 mb-4">
              <stat.icon className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-500">{stat.title}</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span
                key={`${stat.title}-${stat.count}-${dateFilter}`}
                className="text-3xl font-bold text-slate-800 animate-in fade-in zoom-in-95 duration-300"
              >
                {stat.count}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors duration-300 ${
                stat.isPositive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              }`}>
                {stat.trend} {stat.isPositive ? "↑" : "↓"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-xl font-bold text-slate-800">All Cases</h2>
          
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by subject or case number..."
                className="pl-9 w-full sm:w-64 bg-slate-50 border-transparent focus-visible:bg-white transition-colors"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            
            {/* Filter Status */}
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                className="h-9 rounded-md border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by status"
              >
                {statusFilterOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100">
                <th className="font-semibold py-3 px-4 uppercase tracking-wider text-xs">Client</th>
                <th className="font-semibold py-3 px-4 uppercase tracking-wider text-xs">Subject</th>
                <th className="font-semibold py-3 px-4 uppercase tracking-wider text-xs">Date</th>
                <th className="font-semibold py-3 px-4 uppercase tracking-wider text-xs">Status</th>
                <th className="font-semibold py-3 px-4 uppercase tracking-wider text-xs text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-10 px-4 text-center text-sm text-slate-500">
                    Loading cases...
                  </td>
                </tr>
              ) : currentCases.length > 0 ? (
                currentCases.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                          <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${c.client.name}`}
                            alt={c.client.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{c.client.name}</div>
                          <div className="text-xs text-slate-500">{c.client.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-slate-700">{c.subject}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{c.id}</div>
                    </td>
                    <td className="py-4 px-4 text-slate-600">{c.date}</td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[c.status] || "bg-slate-100 text-slate-700"}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Link href={`/dashboard/case/${c.id.toLowerCase()}`}>
                        <Button variant="ghost" size="sm" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100">
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-10 px-4 text-center text-sm text-slate-500">
                    No cases match your current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={effectivePage}
          totalPages={totalPages}
          totalItems={filteredCases.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* New Case Modal */}
      {isNewCaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Create New Case</h3>
              <button 
                onClick={() => setIsNewCaseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              {submitError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {submitError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Subject</label>
                <Input 
                  placeholder="E.g. System crash during checkout" 
                  value={newCaseSubject}
                  onChange={(e) => setNewCaseSubject(e.target.value)}
                  className="w-full bg-slate-50 border-slate-200 focus-visible:ring-amber-500 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Description</label>
                <textarea 
                  rows={4}
                  placeholder="Please describe your issue in detail..." 
                  value={newCaseDescription}
                  onChange={(e) => setNewCaseDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Attachments</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative group">
                  <Upload className="w-8 h-8 text-slate-400 mb-3 group-hover:text-amber-500 transition-colors" />
                  <p className="text-sm font-medium text-slate-700">Click to upload or drag and drop</p>
                  <p className="text-xs text-slate-500 mt-1">SVG, PNG, JPG or GIF (max. 5MB)</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>

                {newCaseImages.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-slate-600">Selected files ({newCaseImages.length})</p>
                    {newCaseImages.map((image, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center">
                            <Upload className="w-4 h-4 text-slate-500" />
                          </div>
                          <span className="text-xs text-slate-700 truncate max-w-[200px]">{image.fileName}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 rounded-b-2xl border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => { setIsNewCaseModalOpen(false); setSubmitError(null); setNewCaseSubject(""); setNewCaseDescription(""); setNewCaseImages([]); }}
                className="bg-white border-slate-200 text-slate-700"
                disabled={isSubmittingCase}
              >
                Cancel
              </Button>
              <Button 
                className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm font-semibold border-0"
                onClick={handleSubmitCase}
                disabled={isSubmittingCase}
              >
                {isSubmittingCase ? "Submitting..." : "Submit Case"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
