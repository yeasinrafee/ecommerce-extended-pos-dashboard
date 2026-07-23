'use client';

import { ReactNode, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Dashboard/Shared/Sidebar';
import Header from '@/components/Dashboard/Shared/Header';
import { routes } from '@/components/Dashboard/Routes/Routes';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { SidebarProvider } from '@/components/Dashboard/Shared/Sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [effectiveCollapsed, setEffectiveCollapsed] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1279px)');
  const pathname = usePathname();
  const toggleMobileSidebar = () => setMobileOpen(!mobileOpen);

  // Auto-collapse sidebar on POS order create page only
  // On other routes, respect user's manual toggle (don't force expand)
  useEffect(() => {
    if (pathname === '/dashboard/pos-order/create') {
      setSidebarCollapsed(true);
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
        onEffectiveChange={setEffectiveCollapsed}
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
          <SidebarProvider collapsed={effectiveCollapsed}>
            {children}
          </SidebarProvider>
        </main>
      </div>
    </div>
  );
}
