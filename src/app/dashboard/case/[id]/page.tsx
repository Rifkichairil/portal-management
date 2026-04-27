"use client";

import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import { useRouter } from "next/navigation";
import {
  Info,
  FileText,
  PlusCircle,
  Star,
  User,
  Activity,
  Globe,
  MapPin,
  Clock,
  CircleDashed,
  StarHalf,
  ChevronLeft,
  Check,
  MessageSquare,
  Paperclip,
  Download,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const caseId = unwrappedParams.id;
  const [activeTab, setActiveTab] = useState("Overview");
  const [caseData, setCaseData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [commentsData, setCommentsData] = useState<any[]>([]);
  const [attachmentsData, setAttachmentsData] = useState<any[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);

  const { user, isAdmin, isManager, isSubmitter } = useUser();
  const router = useRouter();

  // Helper function to format field name
  function formatFieldName(fieldName: string): string {
    if (!fieldName) return 'N/A';
    
    // Remove __c suffix
    let formatted = fieldName.replace(/__c$/, '');
    
    // Replace underscores with spaces and capitalize first letter of each word
    const words = formatted.split('_');
    formatted = words.map(word => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
    
    return formatted;
  }

  // Fetch Activity data from Salesforce via API route
  async function fetchActivityData(caseSfId: string) {
    setIsLoadingActivity(true);
    try {
      const res = await fetch(`/api/salesforce/case/activity?id=${caseSfId}`);
      if (res.ok) {
        const data = await res.json();
        const mappedActivity = (data.data || []).map((item: any) => ({
          ...item,
          formattedField: formatFieldName(item.field),
        }));
        setActivityData(mappedActivity);
      } else {
        console.error('Failed to fetch activity data');
      }
    } catch (error) {
      console.error('Error fetching activity data:', error);
    }
    setIsLoadingActivity(false);
  }

  // Fetch Comments data from Salesforce via API route
  async function fetchCommentsData(caseSfId: string) {
    setIsLoadingComments(true);
    try {
      const res = await fetch(`/api/salesforce/case/comments?id=${caseSfId}`);
      if (res.ok) {
        const data = await res.json();
        const mappedComments = (data.data || []).map((item: any) => ({
          commentBody: item.commentBody,
          createdAt: item.createdAt,
          createdByName: item.createdByName,
        }));
        setCommentsData(mappedComments);
      } else {
        console.error('Failed to fetch comments data');
      }
    } catch (error) {
      console.error('Error fetching comments data:', error);
    }
    setIsLoadingComments(false);
  }

  // Fetch Attachments data from Salesforce via API route
  async function fetchAttachmentsData(caseSfId: string) {
    setIsLoadingAttachments(true);
    try {
      const res = await fetch(`/api/salesforce/case/attachments?id=${caseSfId}`);
      if (res.ok) {
        const data = await res.json();
        setAttachmentsData(data.data || []);
      } else {
        console.error('Failed to fetch attachments data');
      }
    } catch (error) {
      console.error('Error fetching attachments data:', error);
    }
    setIsLoadingAttachments(false);
  }

  useEffect(() => {
    async function fetchCaseDetail() {
      setIsLoading(true);
      const rawIdentifier = caseId;
      const normalizedCaseNumber = caseId.toUpperCase();

      // First try to query by case_sf_id (case-sensitive), fallback to caseNumber
      let { data, error } = await supabase
        .from('case')
        .select(`
          id,
          caseNumber,
          subject,
          status,
          created_at,
          case_sf_id,
          contact_sf_id,
          contact:contact_sf_id (
            fullName,
            phone,
            account:account_id (name, account_sf_id),
            users:user_id (email)
          )
        `)
        .eq('case_sf_id', rawIdentifier)
        .maybeSingle();

      // If not found by case_sf_id, try by caseNumber
      if (!data) {
        const result = await supabase
          .from('case')
          .select(`
            id,
            caseNumber,
            subject,
            status,
            created_at,
          case_sf_id,
          contact_sf_id,
          contact:contact_sf_id (
            fullName,
            phone,
            account:account_id (name, account_sf_id),
            users:user_id (email)
          )
        `)
          .eq('caseNumber', normalizedCaseNumber)
          .maybeSingle();
        data = result.data;
        error = result.error;
      }

      if (data) {
        const contact = Array.isArray(data.contact) ? data.contact[0] : data.contact;
        const account = contact && Array.isArray(contact.account) ? contact.account[0] : contact?.account;
        const userContact = contact && Array.isArray(contact.users) ? contact.users[0] : contact?.users;

        // --- Authorization Check ---
        // Submitter: can only view their own cases
        if (isSubmitter && user?.contact_sf_id && data.contact_sf_id !== user.contact_sf_id) {
          setIsUnauthorized(true);
          setIsLoading(false);
          return;
        }
        // Manager: can only view cases from contacts under their account
        if (isManager && user?.account_sf_id && account?.account_sf_id !== user.account_sf_id) {
          setIsUnauthorized(true);
          setIsLoading(false);
          return;
        }
        
        setCaseData({
          ...data,
          contactInfo: {
            fullName: contact?.fullName || 'Unknown',
            phone: contact?.phone || 'N/A',
            email: userContact?.email || 'N/A',
            company: account?.name || 'Unknown Company'
          }
        });

        // Fetch Salesforce data if case_sf_id exists
        if (data.case_sf_id) {
          fetchActivityData(data.case_sf_id);
          fetchCommentsData(data.case_sf_id);
          fetchAttachmentsData(data.case_sf_id);
        }
      }
      setIsLoading(false);
    }
    
    fetchCaseDetail();
  }, [caseId, user, isManager, isSubmitter]);

  const stages = [
    { id: "new", label: "New", status: caseData?.status?.toLowerCase() === "new" ? "current" : "completed" },
    { id: "open", label: "Open", status: caseData?.status?.toLowerCase() === "open" ? "current" : ["new"].includes(caseData?.status?.toLowerCase()) ? "upcoming" : "completed" },
    { id: "in-progress", label: "In Progress", status: caseData?.status?.toLowerCase() === "in progress" ? "current" : ["new", "open"].includes(caseData?.status?.toLowerCase()) ? "upcoming" : "completed" },
    { id: "solved", label: "Solved", status: caseData?.status?.toLowerCase() === "solved" ? "current" : ["new", "open", "in progress"].includes(caseData?.status?.toLowerCase()) ? "upcoming" : "completed" },
    { id: "closed", label: "Closed", status: caseData?.status?.toLowerCase() === "closed" ? "current" : "upcoming" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-500 font-medium">Loading case details...</div>
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <span className="text-3xl">🔒</span>
        </div>
        <div className="text-slate-800 font-bold text-xl">Akses Ditolak</div>
        <p className="text-slate-500 text-sm">Anda tidak memiliki akses untuk melihat case ini.</p>
        <Link href="/dashboard/case">
          <Button variant="outline">Kembali ke Daftar Case</Button>
        </Link>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
        <div className="text-slate-800 font-bold text-xl">Case Not Found</div>
        <Link href="/dashboard/case">
          <Button variant="outline">Back to Cases</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center text-sm text-slate-500 mb-6">
        <Link href="/dashboard/case" className="flex items-center hover:text-slate-800 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Cases
        </Link>
      </div>

      {/* Header Section */}
      <div className="mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold text-slate-900">[{caseData.caseNumber}] - {caseData.subject}</h1>
            <Info className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Sidebar */}
        <div className="w-full lg:w-[380px] space-y-6 flex-shrink-0">
          
          {/* Case details */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                <Globe className="w-4 h-4 text-slate-400" /> Case Details
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-[140px_1fr] items-start gap-2">
                <span className="text-slate-400 font-medium">Category</span>
                <span className="text-slate-800 font-bold">Technical Support</span>
              </div>
              <div className="grid grid-cols-[140px_1fr] items-start gap-2">
                <span className="text-slate-400 font-medium">Sub Category</span>
                <span className="text-slate-800 font-medium">Login Issue</span>
              </div>
              <div className="grid grid-cols-[140px_1fr] items-start gap-2">
                <span className="text-slate-400 font-medium">Origin</span>
                <span className="text-slate-800 font-medium">Web Portal</span>
              </div>
              <div className="grid grid-cols-[140px_1fr] items-start gap-2">
                <span className="text-slate-400 font-medium">Status</span>
                <span className="text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded text-xs font-bold w-max">{caseData.status}</span>
              </div>
              <div className="w-full h-px bg-slate-100 my-2"></div>
              <div className="grid grid-cols-[140px_1fr] items-start gap-2">
                <span className="text-slate-400 font-medium">Created Date</span>
                <span className="text-slate-800 font-bold">{new Date(caseData.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} <span className="text-slate-400 font-medium">{new Date(caseData.created_at).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })}</span></span>
              </div>
              <div className="grid grid-cols-[140px_1fr] items-start gap-2">
                <span className="text-slate-400 font-medium">Resolution Time</span>
                <span className="text-slate-800 font-bold">-</span>
              </div>
            </div>
          </div>

          {/* Contact details */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                <User className="w-4 h-4 text-slate-400" /> Contact details
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-[120px_1fr] items-start gap-2">
                <span className="text-slate-400 font-medium">Contact Person</span>
                <span className="text-slate-800 font-bold">{caseData.contactInfo.fullName}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-start gap-2">
                <span className="text-slate-400 font-medium">Company Name</span>
                <span className="text-slate-800 font-bold">{caseData.contactInfo.company}</span>
              </div>
              <div className="w-full h-px bg-slate-100 my-2"></div>
              <div className="grid grid-cols-[120px_1fr] items-start gap-2">
                <span className="text-slate-400 font-medium">Email</span>
                <span className="text-slate-800 font-bold">{caseData.contactInfo.email}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-start gap-2">
                <span className="text-slate-400 font-medium">Phone Number</span>
                <span className="text-slate-800 font-bold">{caseData.contactInfo.phone}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Content */}
        <div className="flex-1 space-y-6">
          
          {/* Tabs */}
          <div className="flex border-b border-slate-200 overflow-x-auto">
            <button 
              className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "Overview" ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setActiveTab("Overview")}
            >
              <FileText className="w-4 h-4" /> Overview
            </button>
            <button 
              className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "Activity" ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setActiveTab("Activity")}
            >
              <Activity className="w-4 h-4" /> Activity
            </button>
            <button 
              className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "Comments" ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setActiveTab("Comments")}
            >
              <MessageSquare className="w-4 h-4" /> Comments
            </button>
            <button 
              className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "Attachments" ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setActiveTab("Attachments")}
            >
              <Paperclip className="w-4 h-4" /> Attachments
            </button>
          </div>

          {activeTab === "Activity" && (
            <div className="space-y-6">
              {/* Stage Status */}
              <div className="flex gap-1 w-full">
                {stages.map((stage) => {
                  let bgClass = "";
                  let textClass = "";
                  let icon = null;

                  if (stage.status === "completed") {
                    bgClass = "bg-[#e5f7e6]"; // light green
                    textClass = "text-[#4caf50]";
                    icon = <Check className="w-3.5 h-3.5 mr-1.5" strokeWidth={3} />;
                  } else if (stage.status === "current") {
                    bgClass = "bg-[#5cb85c]"; // solid green
                    textClass = "text-white";
                  } else {
                    bgClass = "bg-slate-50";
                    textClass = "text-slate-500";
                  }

                  return (
                    <div 
                      key={stage.id}
                      className={`flex-1 flex items-center justify-center py-2.5 text-xs font-bold rounded-sm transition-colors cursor-pointer ${bgClass} ${textClass}`}
                    >
                      {icon}
                      {stage.label}
                    </div>
                  );
                })}
              </div>

              {/* History Title */}
              <h2 className="text-xl font-bold text-slate-800 mt-2">History</h2>

              {/* Activity Table */}
              {isLoadingActivity ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-slate-500 font-medium">Loading activity...</div>
                </div>
              ) : activityData.length > 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="font-semibold py-3 px-4 text-slate-600 uppercase tracking-wider text-xs">Field</th>
                        <th className="font-semibold py-3 px-4 text-slate-600 uppercase tracking-wider text-xs">Old Value</th>
                        <th className="font-semibold py-3 px-4 text-slate-600 uppercase tracking-wider text-xs">New Value</th>
                        <th className="font-semibold py-3 px-4 text-slate-600 uppercase tracking-wider text-xs">Changed By</th>
                        <th className="font-semibold py-3 px-4 text-slate-600 uppercase tracking-wider text-xs">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {activityData.map((activity: any, index: number) => (
                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-800">{activity.formattedField || formatFieldName(activity.field) || 'N/A'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-slate-600">{activity.oldValue || '-'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-slate-600">{activity.newValue || '-'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-slate-600">{activity.createdByName || 'Unknown'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-slate-600">
                              {activity.createdAt ? new Date(activity.createdAt).toLocaleString("en-US", { 
                                month: "short", 
                                day: "numeric", 
                                year: "numeric",
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="text-slate-500 font-medium">No activity data available</div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === "Overview" && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-800 mb-2">Subject</h2>
                <p className="text-slate-700 font-medium">{caseData.subject}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-800 mb-2">Description</h2>
                <p className="text-slate-600 leading-relaxed">
                  (Deskripsi belum tersedia di database untuk case ini. Data di bawah ini adalah placeholder).
                  <br/><br/>
                  User melaporkan kendala terkait sistem. Saat memasukkan kredensial, sistem menampilkan pesan error. Mohon tim teknis segera mengecek logs pada server.
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-800 mb-2">Resolution</h2>
                <p className="text-slate-600 italic">Belum ada resolusi, case masih dalam penanganan.</p>
              </div>
            </div>
          )}

          {activeTab === "Comments" && (
            <div className="bg-white border border-slate-200 rounded-xl flex flex-col h-[600px] shadow-sm">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Comments</h2>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">{commentsData.length} Comments</span>
              </div>
              
              {isLoadingComments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-slate-500 font-medium">Loading comments...</div>
                </div>
              ) : commentsData.length > 0 ? (
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {commentsData.map((comment: any, index: number) => (
                    <div key={index} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                        <img 
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.createdByName || 'User'}`} 
                          alt={comment.createdByName || 'User'} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-bold text-slate-800 text-sm">{comment.createdByName || 'Unknown'}</span>
                          <span className="text-xs text-slate-400 font-medium">
                            {comment.createdAt ? new Date(comment.createdAt).toLocaleString("en-US", { 
                              month: "short", 
                              day: "numeric", 
                              year: "numeric",
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'N/A'}
                          </span>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none p-4 text-sm text-slate-700">
                          {comment.commentBody || 'No content'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="text-slate-500 font-medium">No comments available</div>
                </div>
              )}

              <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
                <div className="relative">
                  <textarea 
                    placeholder="Type your comment here..." 
                    rows={3}
                    className="w-full text-sm rounded-xl border border-slate-200 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white shadow-sm"
                  ></textarea>
                  <button className="absolute bottom-3 right-3 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Attachments" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Attachments</h2>
                <Button variant="outline" size="sm" className="bg-white shadow-sm">
                  <PlusCircle className="w-4 h-4 mr-2" /> Upload File
                </Button>
              </div>
              
              {isLoadingAttachments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-slate-500 font-medium">Loading attachments...</div>
                </div>
              ) : attachmentsData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {attachmentsData.map((attachment: any, index: number) => (
                    <div key={index} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow group cursor-pointer">
                      <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="font-bold text-sm text-slate-800 truncate">{attachment.name || attachment.fileName || `Attachment ${index + 1}`}</div>
                        <div className="text-xs text-slate-500 mt-1">{attachment.type || attachment.fileType || 'File'}</div>
                      </div>
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-slate-50 rounded-md" 
                          title="Download"
                          onClick={() => {
                            if (attachment.url) {
                              window.open(attachment.url, '_blank');
                            }
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="text-slate-500 font-medium">No attachments available</div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
