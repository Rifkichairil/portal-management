"use client";

import { useState, useEffect, use, type ChangeEvent } from "react";
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
  MessageSquare,
  Paperclip,
  Download,
  Send,
  Upload,
  X
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
  const [sfCaseDetail, setSfCaseDetail] = useState<any>(null);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadResult, setUploadResult] = useState<{ successCount: number; failedFiles: string[] } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<{ name: string; src: string; downloadUrl?: string } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

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
    const url = `/api/salesforce/case/activity?id=${caseSfId}`;
    const fullUrl = `${window.location.origin}${url}`;
    console.log("[Activity Tab] Fetching activity data");
    console.log("[Activity Tab] Full URL:", fullUrl);
    console.log("[Activity Tab] case_sf_id:", caseSfId);
    setIsLoadingActivity(true);
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        console.log("[Activity Tab] Successfully fetched activity data:", data);
        const mappedActivity = (data.data || []).map((item: any) => ({
          ...item,
          formattedField: formatFieldName(item.field),
        }));
        setActivityData(mappedActivity);
        console.log("[Activity Tab] Mapped activity data:", mappedActivity);
      } else {
        console.error('[Activity Tab] Failed to fetch activity data, status:', res.status);
      }
    } catch (error) {
      console.error('[Activity Tab] Error fetching activity data:', error);
    }
    setIsLoadingActivity(false);
  }

  // Fetch Comments data from Salesforce via API route
  async function fetchCommentsData(caseSfId: string) {
    const url = `/api/salesforce/case/comments?id=${caseSfId}`;
    const fullUrl = `${window.location.origin}${url}`;
    console.log("[Comments Tab] Fetching comments data");
    console.log("[Comments Tab] Full URL:", fullUrl);
    console.log("[Comments Tab] case_sf_id:", caseSfId);
    setIsLoadingComments(true);
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        console.log("[Comments Tab] Successfully fetched comments data:", data);
        const mappedComments = (data.data || []).map((item: any) => ({
          commentBody: item.commentBody,
          commentBodyRichtext: item.commentBodyRichtext,
          createdAt: item.createdAt,
          createdByName: item.createdByName,
        }));
        setCommentsData(mappedComments);
        console.log("[Comments Tab] Mapped comments data:", mappedComments);
      } else {
        console.error('[Comments Tab] Failed to fetch comments data, status:', res.status);
      }
    } catch (error) {
      console.error('[Comments Tab] Error fetching comments data:', error);
    }
    setIsLoadingComments(false);
  }

  // Fetch Attachments data from Salesforce via API route
  async function fetchAttachmentsData(caseSfId: string) {
    const url = `/api/salesforce/case/attachments?id=${caseSfId}`;
    const fullUrl = `${window.location.origin}${url}`;
    console.log("[Attachments Tab] Fetching attachments data");
    console.log("[Attachments Tab] Full URL:", fullUrl);
    console.log("[Attachments Tab] case_sf_id:", caseSfId);
    setIsLoadingAttachments(true);
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        console.log("[Attachments Tab] Successfully fetched attachments data:", data);
        setAttachmentsData(data.data || []);
        console.log("[Attachments Tab] Set attachments data:", data.data);
      } else {
        console.error('[Attachments Tab] Failed to fetch attachments data, status:', res.status);
      }
    } catch (error) {
      console.error('[Attachments Tab] Error fetching attachments data:', error);
    }
    setIsLoadingAttachments(false);
  }

  // Fetch case details from Salesforce via API route
  async function fetchSfCaseDetail(caseSfId: string) {
    const url = `/api/salesforce/case/detail?id=${caseSfId}`;
    console.log("[Case Detail] Fetching Salesforce case details");
    console.log("[Case Detail] case_sf_id:", caseSfId);
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        console.log("[Case Detail] Successfully fetched Salesforce case details:", data);
        if (data.data && data.data.length > 0) {
          setSfCaseDetail(data.data[0]);
        }
      } else {
        console.error('[Case Detail] Failed to fetch Salesforce case details, status:', res.status);
      }
    } catch (error) {
      console.error('[Case Detail] Error fetching Salesforce case details:', error);
    }
  }

  // Submit comment to Salesforce
  async function submitComment() {
    if (!newComment.trim() || !caseData?.case_sf_id) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/salesforce/case/comments?id=${caseData.case_sf_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentBody: newComment,
          commentBodyRichtext: "Portal"
        }),
      });

      if (res.ok) {
        console.log("[Comments] Successfully posted comment");
        setNewComment("");
        // Refresh comments
        fetchCommentsData(caseData.case_sf_id);
      } else {
        console.error("[Comments] Failed to post comment");
      }
    } catch (error) {
      console.error("[Comments] Error posting comment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  }

  function closeUploadModal() {
    setIsUploadModalOpen(false);
    setSelectedFiles([]);
    setUploadResult(null);
  }

  function handleAttachmentFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const pickedFiles = Array.from(files);
    console.log("[Attachments] Selected files:", pickedFiles.map((file) => file.name));

    setUploadResult(null);
    setSelectedFiles((prev) => [...prev, ...pickedFiles]);
    e.target.value = "";
  }

  function removeSelectedAttachment(indexToRemove: number) {
    setSelectedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    setUploadResult(null);
  }

  function openAttachmentPreview(attachment: any, index: number) {
    const previewUrl = attachment.previewUrl;
    const attachmentName = attachment.name || attachment.fileName || `Attachment ${index + 1}`;
    const downloadUrl = attachment.downloadUrl || attachment.url;

    if (!previewUrl) {
      setPreviewAttachment({ name: attachmentName, src: "", downloadUrl });
      setPreviewError("Preview URL tidak tersedia untuk file ini.");
      setIsPreviewLoading(false);
      return;
    }

    setPreviewError(null);
    setIsPreviewLoading(true);
    setPreviewAttachment({
      name: attachmentName,
      src: previewUrl,
      downloadUrl,
    });
  }

  function closeAttachmentPreview() {
    setPreviewAttachment(null);
    setPreviewError(null);
    setIsPreviewLoading(false);
  }

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(",")[1] || "");
      };
      reader.onerror = (error) => reject(error);
    });
  }

  // Handle file upload
  async function handleFileUpload() {
    if (selectedFiles.length === 0) return;

    if (!caseData?.case_sf_id) {
      setUploadResult({
        successCount: 0,
        failedFiles: selectedFiles.map((file) => file.name),
      });
      return;
    }

    setIsUploading(true);
    try {
      const images = await Promise.all(
        selectedFiles.map(async (file) => ({
          fileName: file.name,
          base64Data: await fileToBase64(file),
        }))
      );

      const res = await fetch("/api/salesforce/case/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: caseData.case_sf_id,
          images,
        }),
      });

      if (res.ok) {
        setUploadResult({
          successCount: selectedFiles.length,
          failedFiles: [],
        });
        setSelectedFiles([]);
        fetchAttachmentsData(caseData.case_sf_id);
      } else {
        setUploadResult({
          successCount: 0,
          failedFiles: selectedFiles.map((file) => file.name),
        });
      }
    } catch (error) {
      console.error("[Attachments] Error uploading files:", error);
      setUploadResult({
        successCount: 0,
        failedFiles: selectedFiles.map((file) => file.name),
      });
    } finally {
      setIsUploading(false);
    }
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
          description,
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
            description,
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
        const accountRaw = contact?.account;
        const account = Array.isArray(accountRaw) ? accountRaw[0] : accountRaw;
        const userRaw = contact?.users;
        const userContact = Array.isArray(userRaw) ? userRaw[0] : userRaw;

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
          fetchSfCaseDetail(data.case_sf_id);
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
                <span className="text-slate-800 font-bold">{sfCaseDetail?.category || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-[140px_1fr] items-start gap-2">
                <span className="text-slate-400 font-medium">Sub Category</span>
                <span className="text-slate-800 font-medium">{sfCaseDetail?.subCategory || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-[140px_1fr] items-start gap-2">
                <span className="text-slate-400 font-medium">Origin</span>
                <span className="text-slate-800 font-medium">{sfCaseDetail?.origin || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-[140px_1fr] items-start gap-2">
                <span className="text-slate-400 font-medium">Status</span>
                <span className="text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded text-xs font-bold w-max">{sfCaseDetail?.status || caseData.status}</span>
              </div>
              <div className="w-full h-px bg-slate-100 my-2"></div>
              <div className="grid grid-cols-[140px_1fr] items-start gap-2">
                <span className="text-slate-400 font-medium">Created Date</span>
                <span className="text-slate-800 font-bold">{new Date(caseData.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} <span className="text-slate-400 font-medium">{new Date(caseData.created_at).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })}</span></span>
              </div>
              <div className="grid grid-cols-[140px_1fr] items-start gap-2">
                <span className="text-slate-400 font-medium">Resolution</span>
                <span className="text-slate-800 font-bold">{sfCaseDetail?.resolution || '-'}</span>
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
              {/* Stage Status - Hidden */}
              {/* <div className="flex gap-1 w-full">
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
              </div> */}

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
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {caseData.description || 'No description available'}
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
                  {[...commentsData].reverse().map((comment: any, index: number) => {
                    const isFromPortal = comment.commentBodyRichtext === 'Portal';
                    const displayName = isFromPortal ? user?.username || user?.email || 'You' : comment.createdByName || 'Unknown';
                    return (
                      <div key={index} className={`flex gap-4 ${isFromPortal ? 'flex-row-reverse' : ''}`}>
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                          <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`}
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className={`flex-1 ${isFromPortal ? 'flex flex-col items-end' : ''}`}>
                          <div className={`flex items-baseline gap-2 mb-1 ${isFromPortal ? 'flex-row-reverse' : ''}`}>
                            <span className="font-bold text-slate-800 text-sm">{displayName}</span>
                          </div>
                          <div className={`p-4 text-sm max-w-[80%] ${
                            isFromPortal
                              ? 'bg-blue-600 text-white rounded-2xl rounded-tr-none'
                              : 'bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none text-slate-700'
                          }`}>
                            <div className="mb-2">{comment.commentBody || 'No content'}</div>
                            <div className={`text-xs opacity-70 ${isFromPortal ? 'text-blue-100' : 'text-slate-400'}`}>
                              {comment.createdAt ? new Date(comment.createdAt).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={isSubmittingComment}
                    className="w-full text-sm rounded-xl border border-slate-200 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white shadow-sm disabled:opacity-50"
                  ></textarea>
                  <button
                    onClick={submitComment}
                    disabled={isSubmittingComment || !newComment.trim()}
                    className="absolute bottom-3 right-3 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingComment ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Attachments" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Attachments</h2>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-white shadow-sm"
                  onClick={() => {
                    setUploadResult(null);
                    setSelectedFiles([]);
                    setIsUploadModalOpen(true);
                  }}
                >
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
                    <div
                      key={index}
                      className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow group cursor-pointer"
                      onClick={() => openAttachmentPreview(attachment, index)}
                    >
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
                          onClick={(e) => {
                            e.stopPropagation();
                            const directDownloadUrl = attachment.downloadUrl || attachment.url;
                            if (directDownloadUrl) {
                              window.open(directDownloadUrl, "_blank");
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

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 truncate">{previewAttachment.name}</h3>
              <button
                onClick={closeAttachmentPreview}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 bg-slate-50 min-h-[420px] flex items-center justify-center relative">
              {previewAttachment.src ? (
                <div className="w-full h-full flex items-center justify-center relative">
                  {isPreviewLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80">
                      <div className="text-slate-600 text-sm font-medium">Loading preview...</div>
                    </div>
                  )}
                  <img
                    src={previewAttachment.src}
                    alt={previewAttachment.name}
                    className="max-h-[65vh] max-w-full object-contain rounded-lg"
                    onLoad={() => {
                      setIsPreviewLoading(false);
                      setPreviewError(null);
                    }}
                    onError={() => {
                      setIsPreviewLoading(false);
                      setPreviewError("Preview tidak bisa ditampilkan untuk file ini.");
                    }}
                  />
                </div>
              ) : (
                <div className="text-slate-500 text-sm font-medium">Preview URL tidak tersedia.</div>
              )}

              {previewError && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-xs text-amber-700">
                  {previewError}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-white flex justify-end gap-3 border-t border-slate-100">
              <Button variant="outline" onClick={closeAttachmentPreview} className="bg-white border-slate-200 text-slate-700">
                Close
              </Button>
              {previewAttachment.downloadUrl && (
                <Button
                  onClick={() => window.open(previewAttachment.downloadUrl, "_blank")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Download
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Upload Attachment</h3>
              <button
                onClick={closeUploadModal}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              {uploadResult && (
                <div className={`rounded-lg px-4 py-3 text-sm border ${uploadResult.failedFiles.length === 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                  <p className="font-semibold">{uploadResult.successCount} file berhasil diupload.</p>
                  {uploadResult.failedFiles.length > 0 && (
                    <p className="mt-1">{uploadResult.failedFiles.length} file gagal dan tetap ada di daftar untuk dicoba lagi.</p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Attachments</label>
                <p className="text-xs font-medium text-slate-500">
                  {selectedFiles.length > 0 ? `Selected files (${selectedFiles.length})` : "No files selected yet"}
                </p>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative group">
                  <Upload className="w-8 h-8 text-slate-400 mb-3 group-hover:text-amber-500 transition-colors" />
                  <p className="text-sm font-medium text-slate-700">Click to upload or drag and drop</p>
                  <p className="text-xs text-slate-500 mt-1">SVG, PNG, JPG or GIF (max. 5MB)</p>
                  <input
                    type="file"
                    multiple
                    onChange={handleAttachmentFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>

                <div className="mt-3 space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center flex-shrink-0">
                          <Upload className="w-4 h-4 text-slate-500" />
                        </div>
                        <span className="text-xs text-slate-700 truncate max-w-[300px]">{file.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSelectedAttachment(index)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 rounded-b-2xl border-t border-slate-100">
              <Button
                variant="outline"
                onClick={closeUploadModal}
                className="bg-white border-slate-200 text-slate-700"
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleFileUpload}
                disabled={selectedFiles.length === 0 || isUploading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Uploading...
                  </span>
                ) : (
                  `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
