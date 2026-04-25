"use client";

import { useMemo, useState } from "react";
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
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Mock data
const caseStats = [
  { title: "New", count: 12, trend: "+7.4%", isPositive: true, icon: Briefcase },
  { title: "Open", count: 24, trend: "+2%", isPositive: true, icon: Clock },
  { title: "In Progress", count: 18, trend: "+3.5%", isPositive: true, icon: ArrowUpRight },
  { title: "Escalated", count: 4, trend: "-1.2%", isPositive: false, icon: ShieldAlert },
  { title: "Solved", count: 45, trend: "+12%", isPositive: true, icon: CheckCircle2 },
  { title: "Closed", count: 112, trend: "+4.1%", isPositive: true, icon: AlertCircle },
];

const mockCases = [
  {
    id: "CAS-1001",
    client: { name: "Lena Harper", email: "lena.harper@example.com" },
    subject: "Cannot access portal dashboard",
    date: "May 21, 2026",
    status: "In progress",
    priority: "High",
  },
  {
    id: "CAS-1002",
    client: { name: "Sophie Kim", email: "sophie.kim@example.com" },
    subject: "Billing issue for last month",
    date: "May 11, 2026",
    status: "Open",
    priority: "Medium",
  },
  {
    id: "CAS-1003",
    client: { name: "Noah Bennett", email: "noah.b@example.com" },
    subject: "Feature request: Export to PDF",
    date: "May 19, 2026",
    status: "Solved",
    priority: "Low",
  },
  {
    id: "CAS-1004",
    client: { name: "Amelia Stone", email: "amelia.stone@example.com" },
    subject: "2FA code not received",
    date: "May 18, 2026",
    status: "New",
    priority: "High",
  },
  {
    id: "CAS-1005",
    client: { name: "Ethan Clarke", email: "ethan.clarke@example.com" },
    subject: "Unable to update company profile",
    date: "May 17, 2026",
    status: "Open",
    priority: "Medium",
  },
  {
    id: "CAS-1006",
    client: { name: "Mia Rodriguez", email: "mia.rodriguez@example.com" },
    subject: "Error while uploading invoice attachment",
    date: "May 16, 2026",
    status: "Escalated",
    priority: "High",
  },
  {
    id: "CAS-1007",
    client: { name: "Lucas Turner", email: "lucas.turner@example.com" },
    subject: "Notification emails delayed",
    date: "May 15, 2026",
    status: "In progress",
    priority: "Medium",
  },
  {
    id: "CAS-1008",
    client: { name: "Ava Nguyen", email: "ava.nguyen@example.com" },
    subject: "Need role-based access for team",
    date: "May 14, 2026",
    status: "Open",
    priority: "Low",
  },
  {
    id: "CAS-1009",
    client: { name: "Benjamin Lee", email: "ben.lee@example.com" },
    subject: "Dashboard metrics not refreshing",
    date: "May 13, 2026",
    status: "In progress",
    priority: "High",
  },
  {
    id: "CAS-1010",
    client: { name: "Chloe Adams", email: "chloe.adams@example.com" },
    subject: "CSV export includes wrong delimiter",
    date: "May 12, 2026",
    status: "Solved",
    priority: "Low",
  },
  {
    id: "CAS-1011",
    client: { name: "Henry Brooks", email: "henry.brooks@example.com" },
    subject: "Cannot reset password",
    date: "May 10, 2026",
    status: "New",
    priority: "High",
  },
  {
    id: "CAS-1012",
    client: { name: "Ella Foster", email: "ella.foster@example.com" },
    subject: "Duplicate billing line items",
    date: "May 9, 2026",
    status: "Escalated",
    priority: "High",
  },
  {
    id: "CAS-1013",
    client: { name: "Jackson Ward", email: "jackson.ward@example.com" },
    subject: "Need audit log for user actions",
    date: "May 8, 2026",
    status: "Open",
    priority: "Medium",
  },
  {
    id: "CAS-1014",
    client: { name: "Grace Hill", email: "grace.hill@example.com" },
    subject: "Mobile layout overlaps sidebar",
    date: "May 7, 2026",
    status: "In progress",
    priority: "Medium",
  },
  {
    id: "CAS-1015",
    client: { name: "Daniel Scott", email: "daniel.scott@example.com" },
    subject: "Webhook endpoint timeout",
    date: "May 6, 2026",
    status: "Escalated",
    priority: "High",
  },
  {
    id: "CAS-1016",
    client: { name: "Harper Evans", email: "harper.evans@example.com" },
    subject: "Need invoice date format customization",
    date: "May 5, 2026",
    status: "Solved",
    priority: "Low",
  },
  {
    id: "CAS-1017",
    client: { name: "Sebastian Perez", email: "sebastian.perez@example.com" },
    subject: "Session expired too quickly",
    date: "May 4, 2026",
    status: "Open",
    priority: "Medium",
  },
  {
    id: "CAS-1018",
    client: { name: "Zoe Collins", email: "zoe.collins@example.com" },
    subject: "Search results missing recent cases",
    date: "May 3, 2026",
    status: "In progress",
    priority: "Medium",
  },
  {
    id: "CAS-1019",
    client: { name: "Logan Morris", email: "logan.morris@example.com" },
    subject: "Need API key regeneration option",
    date: "May 2, 2026",
    status: "New",
    priority: "Low",
  },
  {
    id: "CAS-1020",
    client: { name: "Nora Price", email: "nora.price@example.com" },
    subject: "Case detail page loads slowly",
    date: "May 1, 2026",
    status: "Closed",
    priority: "Low",
  },
];

const statusStyles: Record<string, string> = {
  "New": "bg-blue-100 text-blue-700",
  "Open": "bg-amber-100 text-amber-700",
  "In progress": "bg-indigo-100 text-indigo-700",
  "Escalated": "bg-rose-100 text-rose-700",
  "Solved": "bg-emerald-100 text-emerald-700",
  "Closed": "bg-slate-100 text-slate-700",
};

type DateFilter = "All" | "This week" | "This month" | "This year";

export default function CaseDashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<DateFilter>("All");

  // Modal State
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);

  const dateFilteredCases = useMemo(() => {
    const now = new Date();
    const startOfCurrentWeek = new Date(now);
    startOfCurrentWeek.setHours(0, 0, 0, 0);
    startOfCurrentWeek.setDate(now.getDate() - now.getDay());
    const startOfNextWeek = new Date(startOfCurrentWeek);
    startOfNextWeek.setDate(startOfCurrentWeek.getDate() + 7);
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return mockCases.filter((caseItem) => {
      const caseDate = new Date(caseItem.date);

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
  }, [dateFilter]);

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
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              aria-label="Filter by date range"
            >
              <option value="All">All time</option>
              <option value="This week">This week</option>
              <option value="This month">This month</option>
              <option value="This year">This year</option>
            </select>
          </div>
          <Button 
            className="bg-amber-200 hover:bg-amber-300 text-amber-900 font-semibold shadow-none border-0"
            onClick={() => setIsNewCaseModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> New Case
          </Button>
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
          <h2 className="text-xl font-bold text-slate-800">Active Cases</h2>
          
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                placeholder="Search by subject or case number..."
                className="pl-9 w-full sm:w-64 bg-slate-50 border-transparent focus-visible:bg-white transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Filter Status */}
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                className="h-9 rounded-md border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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
              </tr>
            </thead>
            <tbody>
              {filteredCases.length > 0 ? (
                filteredCases.map((c) => (
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
                    <td className="py-4 px-4 text-slate-600">
                      {c.date}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[c.status] || "bg-slate-100 text-slate-700"}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-10 px-4 text-center text-sm text-slate-500">
                    No cases match your current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Subject</label>
                <Input 
                  placeholder="E.g. System crash during checkout" 
                  className="w-full bg-slate-50 border-slate-200 focus-visible:ring-amber-500 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Description</label>
                <textarea 
                  rows={4}
                  placeholder="Please describe your issue in detail..." 
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
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 rounded-b-2xl border-t border-slate-100">
              <Button 
                variant="outline" 
                onClick={() => setIsNewCaseModalOpen(false)}
                className="bg-white border-slate-200 text-slate-700"
              >
                Cancel
              </Button>
              <Button 
                className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm font-semibold border-0"
              >
                Submit Case
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
