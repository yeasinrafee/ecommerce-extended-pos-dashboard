"use client";

import { ReactNode, useState } from "react";
import Sidebar from "@/components/Dashboard/Shared/Sidebar";
import Header from "@/components/Dashboard/Shared/Header";
import { routes } from "@/components/Dashboard/Routes/Routes";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const toggleMobileSidebar = () => setMobileOpen(!mobileOpen);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        routes={routes}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header
          onMenuClick={toggleMobileSidebar}
          showMenuButton={isMobile}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
