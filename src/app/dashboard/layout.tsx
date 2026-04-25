"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Briefcase, 
  ChevronRight, 
  ChevronLeft,
  Settings,
  FolderOpen,
  LogOut,
  Building2,
  Users,
  Bell
} from "lucide-react";
import { UserProvider, useUser } from "@/lib/user-context";

function SidebarContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, isManager, isSubmitter, isLoading } = useUser();

  // Role-based nav items — only filter once user is loaded
  const allNavItems = [
    { title: "Case", href: "/dashboard/case", icon: Briefcase, roles: ["admin", "manager", "submitercase"] },
    { title: "Account", href: "/dashboard/account", icon: Building2, roles: ["admin"] },
    { title: "Contact", href: "/dashboard/contact", icon: Users, roles: ["admin", "manager"] },
  ];

  const navItems = isLoading
    ? [] // show nothing while loading, avoids flash
    : allNavItems.filter(item => item.roles.includes(user?.role || ""));

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  return (
    <aside 
      className={`relative bg-white border-r border-slate-200 transition-all duration-300 flex flex-col ${
        isSidebarOpen ? "w-64" : "w-20"
      }`}
    >
      {/* Toggle Button */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute -right-3 top-20 bg-white border border-slate-200 rounded-full p-1 shadow-sm text-slate-400 hover:text-slate-600 z-10"
      >
        {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Logo Area */}
      <div className="h-20 flex items-center px-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white font-bold text-sm">
            in
          </div>
          {isSidebarOpen && <span className="font-bold text-lg">PORTAL</span>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-4">
        <div className="space-y-6">
          <div className="space-y-2">
            {isSidebarOpen && (
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
                <FolderOpen className="w-3 h-3 inline mr-1" /> Manajemen
              </div>
            )}
            <div className="space-y-1">
              {navItems.map((item, j) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link 
                    key={j} 
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive 
                        ? "bg-amber-100/50 text-amber-700" 
                        : "text-slate-600 hover:bg-slate-100"
                    } ${!isSidebarOpen && "justify-center"}`}
                    title={item.title}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {isSidebarOpen && <span className="font-medium text-sm">{item.title}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-slate-100 flex flex-col gap-2">
        <button className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors ${!isSidebarOpen && "justify-center"}`}>
          <Bell className="w-5 h-5 flex-shrink-0" />
          {isSidebarOpen && <span className="font-medium text-sm">Notifications</span>}
        </button>

        {/* Settings: admin only */}
        {isAdmin && (
          <Link href="/dashboard/settings" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors ${pathname === "/dashboard/settings" ? "bg-slate-100 font-semibold" : ""} ${!isSidebarOpen && "justify-center"}`}>
            <Settings className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span className="font-medium text-sm">Settings</span>}
          </Link>
        )}

        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors ${!isSidebarOpen && "justify-center"}`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isSidebarOpen && <span className="font-medium text-sm">Log out</span>}
        </button>
        
        <div className={`mt-4 flex items-center gap-3 px-3 py-2 ${!isSidebarOpen && "justify-center"}`}>
          <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'user'}`} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-slate-800 truncate">{user?.username || 'User'}</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500 truncate">{user?.email || ''}</span>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wide mt-0.5 ${
                isAdmin ? 'text-red-500' : isManager ? 'text-blue-500' : 'text-emerald-500'
              }`}>{user?.role}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
        <SidebarContent />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8">
            {children}
          </div>
        </main>
      </div>
    </UserProvider>
  );
}
