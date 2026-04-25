"use client";

import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import { Pagination } from "@/components/ui/pagination";
import { 
  Search, 
  Plus,
  Users,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Mock data generation
// mockAccounts removed, using Supabase fetch
const ITEMS_PER_PAGE = 10;

export default function AccountDashboardPage() {
  const { isAdmin } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);


  useEffect(() => {
    async function fetchAccounts() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('account')
        .select(`
          id,
          account_sf_id,
          name,
          phone,
          email,
          website,
          billingCity,
          contact (count)
        `);
      
      if (error) {
        console.error("Error fetching accounts:", error);
      } else if (data) {
        const mappedAccounts = data.map(item => ({
          id: item.id,
          account_sf_id: item.account_sf_id || "N/A",
          name: item.name,
          phone: item.phone || "N/A",
          email: item.email || "N/A",
          website: item.website || "N/A",
          billingCity: item.billingCity || "Unknown",
          contactCount: item.contact ? item.contact[0]?.count || 0 : 0
        }));
        setAccounts(mappedAccounts);
      }
      setIsLoading(false);
    }
    fetchAccounts();
  }, []);

  // Get unique cities for filter
  const uniqueCities = ["All", ...Array.from(new Set(accounts.map(a => a.billingCity)))];

  const filteredAccounts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return accounts.filter((acc) => {
      // Filter by city
      const matchesCity = cityFilter === "All" || acc.billingCity === cityFilter;
      if (!matchesCity) return false;

      // Filter by search term
      if (!normalizedSearch) return true;

      return (
        acc.name.toLowerCase().includes(normalizedSearch) ||
        acc.account_sf_id.toLowerCase().includes(normalizedSearch) ||
        acc.email.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [searchTerm, cityFilter, accounts]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE);
  const currentAccounts = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAccounts.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredAccounts, currentPage]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, cityFilter]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Account Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and view all registered accounts and companies.</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-sm border-0">
              <Plus className="w-4 h-4 mr-2" /> New Account
            </Button>
          )}
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 text-slate-800">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Accounts Directory</h2>
              <p className="text-xs text-slate-500">{filteredAccounts.length} total accounts</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                placeholder="Search by name, ID or email..."
                className="pl-9 w-full sm:w-64 bg-slate-50 border-transparent focus-visible:bg-white transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Filter City */}
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                className="h-10 rounded-md border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
              >
                {uniqueCities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="font-semibold py-4 px-6">Company Info</th>
                <th className="font-semibold py-4 px-6">Contact Details</th>
                <th className="font-semibold py-4 px-6">Location</th>
                <th className="font-semibold py-4 px-6 text-center">Contacts</th>
                <th className="font-semibold py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 px-6 text-center text-slate-500">
                    Loading accounts...
                  </td>
                </tr>
              ) : currentAccounts.length > 0 ? (
                currentAccounts.map((acc) => (
                  <tr key={acc.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600 font-bold">
                          {acc.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{acc.name}</div>
                          <div className="text-xs font-mono text-slate-400 mt-0.5">{acc.account_sf_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[150px]" title={acc.email}>{acc.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{acc.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-800 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {acc.billingCity}
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs">
                          <Globe className="w-3.5 h-3.5 text-slate-300" />
                          <span className="truncate max-w-[150px]" title={acc.website}>{acc.website}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold text-sm">
                        {acc.contactCount}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedAccount(acc)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 px-6 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-slate-300" />
                      </div>
                      <p>No accounts found matching your criteria.</p>
                      <Button variant="outline" onClick={() => { setSearchTerm(""); setCityFilter("All"); }}>
                        Clear Filters
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAccounts.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Account Quick-View Modal */}
      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 leading-tight">{selectedAccount.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Account Quick View</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAccount(null)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <div className="grid grid-cols-1 gap-3 bg-slate-50 rounded-xl p-4 text-sm">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Email</div>
                    <div className="text-slate-800 mt-0.5">{selectedAccount.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Phone</div>
                    <div className="text-slate-800 mt-0.5">{selectedAccount.phone}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Website</div>
                    <div className="text-slate-800 mt-0.5">{selectedAccount.website}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Location</div>
                    <div className="text-slate-800 mt-0.5">{selectedAccount.billingCity}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Contacts</div>
                    <div className="text-slate-800 font-bold mt-0.5">{selectedAccount.contactCount}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 flex justify-end rounded-b-2xl border-t border-slate-100">
              <Button variant="outline" onClick={() => setSelectedAccount(null)} className="bg-white">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



