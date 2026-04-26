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
  Smartphone,
  Eye,
  X,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import NewContactModal from "@/components/new-contact-modal";

// Mock data generation
// mockContacts removed, using Supabase fetch
const ITEMS_PER_PAGE = 10;

export default function ContactDashboardPage() {
  const { isAdmin, isManager, user } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);


  useEffect(() => {
    async function fetchContacts() {
      if (!user && isManager) return; // wait for user before fetching (manager needs account_sf_id)
      setIsLoading(true);

      let query = supabase
        .from('contact')
        .select(`
          id,
          account_id,
          firstName,
          lastName,
          fullName,
          title,
          phone,
          mobile,
          users:user_id (email),
          account:account_id (name, account_sf_id),
          case (count)
        `);

      // Manager: only see contacts within their account
      if (isManager && user?.account_sf_id) {
        query = (query as any).eq('account.account_sf_id', user.account_sf_id);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching contacts:", error);
      } else if (data) {
        const mappedContacts = data.map((item: any) => {
          const userContact = item.users && Array.isArray(item.users) ? item.users[0] : item.users;
          const account = item.account && Array.isArray(item.account) ? item.account[0] : item.account;
          return {
            id: item.id,
            fullName: item.fullName || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Unknown',
            title: item.title || 'N/A',
            accountName: account?.name || 'Unknown Company',
            phone: item.phone || 'N/A',
            mobile: item.mobile || 'N/A',
            email: userContact?.email || 'N/A',
            caseCount: item.case ? item.case[0]?.count || 0 : 0
          };
        });
        setContacts(mappedContacts);
      }
      setIsLoading(false);
    }
    fetchContacts();
  }, [user, isManager, isNewContactModalOpen]);

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
            <Button 
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-sm border-0"
              onClick={() => setIsNewContactModalOpen(true)}
            >
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
                      <button
                        onClick={() => setSelectedContact(contact)}
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

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredContacts.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* New Contact Modal */}
      <NewContactModal
        isOpen={isNewContactModalOpen}
        onClose={() => setIsNewContactModalOpen(false)}
        onSuccess={() => {
          setIsNewContactModalOpen(false);
        }}
      />

      {/* Contact Quick-View Modal */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedContact.fullName}`} alt={selectedContact.fullName} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">{selectedContact.fullName}</h3>
                  <p className="text-xs text-slate-400">{selectedContact.title}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-3 bg-slate-50 rounded-xl p-4 text-sm">
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Company</div>
                    <div className="text-slate-800 mt-0.5">{selectedContact.accountName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Email</div>
                    <div className="text-slate-800 mt-0.5">{selectedContact.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Phone</div>
                    <div className="text-slate-800 mt-0.5">{selectedContact.phone}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Mobile</div>
                    <div className="text-slate-800 mt-0.5">{selectedContact.mobile}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Cases</div>
                    <div className="text-slate-800 font-bold mt-0.5">{selectedContact.caseCount}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 flex justify-end rounded-b-2xl border-t border-slate-100">
              <Button variant="outline" onClick={() => setSelectedContact(null)} className="bg-white">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
