'use client';

import { ReactNode, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Dashboard/Shared/Sidebar';
import Header from '@/components/Dashboard/Shared/Header';
import { routes } from '@/components/Dashboard/Routes/Routes';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1365px)');
  const pathname = usePathname();
  const toggleMobileSidebar = () => setMobileOpen(!mobileOpen);

  // Auto-collapse sidebar on POS order create page, expand on others
  useEffect(() => {
    if (pathname === '/dashboard/pos-order/create') {
      setSidebarCollapsed(true);
    } else {
      setSidebarCollapsed(false);
    }
  }, [pathname]);

  return (
    <div className='flex h-screen bg-white'>
      {/* Sidebar */}
      <Sidebar
        routes={routes}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Content */}
      <div className='flex flex-1 flex-col overflow-hidden'>
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
        <main className='flex-1 overflow-auto bg-[#f4f5f7] p-0'>
          {children}
        </main>
      </div>
    </div>
  );
}
