"use client";

import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import { 
  Search, 
  Plus,
  Users,
  Building2,
  Mail,
  Phone,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Mock data generation
// mockContacts removed, using Supabase fetch
const ITEMS_PER_PAGE = 10;

export default function ContactDashboardPage() {
  const { isAdmin } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchContacts() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('contact')
        .select(`
          id,
          firstName,
          lastName,
          fullName,
          title,
          phone,
          mobile,
          users:user_id (email),
          account:account_sf_id (name),
          case (count)
        `);
      
      if (error) {
        console.error("Error fetching contacts:", error);
      } else if (data) {
        const mappedContacts = data.map(item => {
          const user = item.users && Array.isArray(item.users) ? item.users[0] : item.users;
          const account = item.account && Array.isArray(item.account) ? item.account[0] : item.account;
          
          return {
            id: item.id,
            fullName: item.fullName || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Unknown',
            title: item.title || 'N/A',
            accountName: account?.name || 'Unknown Company',
            phone: item.phone || 'N/A',
            mobile: item.mobile || 'N/A',
            email: user?.email || 'N/A',
            caseCount: item.case ? item.case[0]?.count || 0 : 0
          };
        });
        setContacts(mappedContacts);
      }
      setIsLoading(false);
    }
    fetchContacts();
  }, []);

  // Get unique companies for filter
  const uniqueCompanies = ["All", ...Array.from(new Set(contacts.map(c => c.accountName)))];

  const filteredContacts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return contacts.filter((contact) => {
      // Filter by company
      const matchesCompany = companyFilter === "All" || contact.accountName === companyFilter;
      if (!matchesCompany) return false;

      // Filter by search term
      if (!normalizedSearch) return true;

      return (
        contact.fullName.toLowerCase().includes(normalizedSearch) ||
        contact.email.toLowerCase().includes(normalizedSearch) ||
        contact.accountName.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [searchTerm, companyFilter, contacts]);

  // Pagination logic
  const totalPages = Math.ceil(filteredContacts.length / ITEMS_PER_PAGE);
  const currentContacts = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredContacts.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredContacts, currentPage]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, companyFilter]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Contact Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and view all registered contacts and their details.</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-sm border-0">
              <Plus className="w-4 h-4 mr-2" /> New Contact
            </Button>
          )}
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 text-slate-800">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Contacts Directory</h2>
              <p className="text-xs text-slate-500">{filteredContacts.length} total contacts</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                placeholder="Search by name, email or company..."
                className="pl-9 w-full sm:w-64 bg-slate-50 border-transparent focus-visible:bg-white transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Filter Company */}
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                className="h-10 rounded-md border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none max-w-[200px] truncate"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
              >
                {uniqueCompanies.map((company) => (
                  <option key={company} value={company}>{company}</option>
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
                <th className="font-semibold py-4 px-6">Contact Info</th>
                <th className="font-semibold py-4 px-6">Communication</th>
                <th className="font-semibold py-4 px-6">Associated Company</th>
                <th className="font-semibold py-4 px-6 text-center">Cases</th>
                <th className="font-semibold py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 px-6 text-center text-slate-500">
                    Loading contacts...
                  </td>
                </tr>
              ) : currentContacts.length > 0 ? (
                currentContacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                          <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.fullName}`}
                            alt={contact.fullName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{contact.fullName}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{contact.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[150px]" title={contact.email}>{contact.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 text-xs">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{contact.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 text-xs">
                          <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{contact.mobile}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-slate-800 font-medium">
                        <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-[200px]" title={contact.accountName}>{contact.accountName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold text-sm">
                        {contact.caseCount}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 font-medium">
                        View Profile
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 px-6 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                        <Users className="w-6 h-6 text-slate-300" />
                      </div>
                      <p>No contacts found matching your criteria.</p>
                      <Button variant="outline" onClick={() => { setSearchTerm(""); setCompanyFilter("All"); }}>
                        Clear Filters
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500 bg-slate-50/50 rounded-b-2xl">
            <div>
              Showing <span className="font-medium text-slate-800">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to <span className="font-medium text-slate-800">{Math.min(currentPage * ITEMS_PER_PAGE, filteredContacts.length)}</span> of <span className="font-medium text-slate-800">{filteredContacts.length}</span> results
            </div>
            
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="icon"
                className="h-8 w-8 disabled:opacity-50" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center gap-1 mx-2">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  // Show limited pages logic (e.g. 1 2 3 ... 10)
                  if (
                    totalPages <= 5 || 
                    pageNum === 1 || 
                    pageNum === totalPages || 
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-8 w-8 rounded-md flex items-center justify-center text-sm font-medium transition-colors ${
                          currentPage === pageNum 
                            ? "bg-purple-600 text-white" 
                            : "hover:bg-slate-200 text-slate-600"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === currentPage - 2 || 
                    pageNum === currentPage + 2
                  ) {
                    return <span key={pageNum} className="px-1 text-slate-400">...</span>;
                  }
                  return null;
                })}
              </div>

              <Button 
                variant="outline" 
                size="icon"
                className="h-8 w-8 disabled:opacity-50" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
