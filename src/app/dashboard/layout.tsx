"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Briefcase, 
  ChevronRight, 
  ChevronLeft,
  LayoutDashboard,
  Users,
  Bell,
  Settings,
  FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const pathname = usePathname();

  // Menu items based on prompt
  const navItems = [
    {
      title: "Manajemen",
      icon: FolderOpen,
      items: [
        { title: "Case", href: "/dashboard/case", icon: Briefcase },
        { title: "Account", href: "/dashboard/account", icon: Users },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar */}
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
            {navItems.map((group, i) => (
              <div key={i} className="space-y-2">
                {isSidebarOpen && (
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
                    {group.title}
                  </div>
                )}
                {/* Fallback group icon when closed, or just show sub-items */}
                <div className="space-y-1">
                  {group.items.map((item, j) => {
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
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-100 flex flex-col gap-2">
          <button className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors ${!isSidebarOpen && "justify-center"}`}>
            <Bell className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span className="font-medium text-sm">Notifications</span>}
          </button>
          <button className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors ${!isSidebarOpen && "justify-center"}`}>
            <Settings className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span className="font-medium text-sm">Settings</span>}
          </button>
          
          <div className={`mt-4 flex items-center gap-3 px-3 py-2 ${!isSidebarOpen && "justify-center"}`}>
            <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden">
              <img src={'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-800">Admin User</span>
                <span className="text-xs text-slate-500">admin@portal.com</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
