'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { usePathname } from 'next/navigation';
import SidebarItem from './SidebarItem';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAuthStore } from '@/store/useAuthStore';
import type { StoredUser } from '@/types/auth';
import Image from 'next/image';
import logoPos from '@/assets/images/logo_pos.jpeg';
import posIcon from '@/assets/images/pos_icon.png';

interface SidebarProps {
  routes: {
    icon: React.ElementType;
    label: string;
    href?: string;
    active?: boolean;
    subItems?: {
      icon?: React.ElementType;
      label: string;
      href?: string;
      active?: boolean;
    }[];
  }[];
  user?: {
    name: string;
    email: string;
    image?: string;
    fallback?: string;
    role?: string;
  };
  title?: string;
  logo?: React.ReactNode;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
}

const Sidebar = ({
  routes,
  user,
  title = 'POS Dashboard',
  logo,
  mobileOpen = false,
  setMobileOpen,
  collapsed = false,
  setCollapsed,
}: SidebarProps) => {
  const [internalCollapsed, setInternalCollapsed] = useState(collapsed);
  const [mounted, setMounted] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1365px)');
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const storedUser = useAuthStore((s) => s.user);
  const defaultUser = {
    name: 'Admin User',
    email: 'admin@example.com',
    fallback: 'AU',
  };
  const currentUser:
    | StoredUser
    | {
        name: string;
        email: string;
        image?: string | null;
        fallback?: string;
        role?: string;
      } = (storedUser ?? user ?? defaultUser) as any;

  const visibleRoutes = routes.filter((route) => {
    // only show Manage Admin route for SUPER_ADMIN users
    if (route.href === '/dashboard/admin') {
      return mounted && currentUser?.role === 'SUPER_ADMIN';
    }
    return true;
  });

  const processedRoutes = visibleRoutes.map((route) => {
    const isRouteActive = pathname === route.href;

    let hasActiveChild = false;
    const processedSubItems = route.subItems?.map((subItem) => {
      const isSubItemActive = pathname === subItem.href;
      if (isSubItemActive) {
        hasActiveChild = true;
      }
      return {
        ...subItem,
        active: isSubItemActive,
      };
    });

    return {
      ...route,
      active: isRouteActive || hasActiveChild,
      subItems: processedSubItems,
    };
  });

  useEffect(() => {
    setInternalCollapsed(collapsed);
  }, [collapsed]);

  const toggleMobile = () => {
    if (setMobileOpen) {
      setMobileOpen(!mobileOpen);
    }
  };

  const isCollapsed = setCollapsed ? collapsed : internalCollapsed;
  const effectiveCollapsed = isMobile ? false : isCollapsed;

  const getInitials = (name?: string) => {
    if (!name) return 'AU';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return 'AU';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  return (
    <TooltipProvider>
      {/* Mobile overlay backdrop */}
      {isMobile && mobileOpen && (
        <div
          className='fixed inset-0 z-40 bg-black/40 backdrop-blur-sm 2xl:hidden'
          onClick={() => setMobileOpen?.(false)}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 border-r border-slate-200 bg-white text-slate-900 shadow-sm transition-all duration-300 ease-in-out 2xl:relative 2xl:translate-x-0',
          isMobile && !mobileOpen ? '-translate-x-full' : 'translate-x-0',
          isMobile ? 'w-80' : '',
          !isMobile && (isCollapsed ? 'w-16' : 'w-56 2xl:w-68'),
        )}
      >
        {/* Sidebar Header */}
        <div
          className={cn(
            'flex h-16 items-center border-b border-slate-200 bg-white',
            effectiveCollapsed ? 'justify-center px-0' : 'justify-between px-4',
          )}
        >
          {!effectiveCollapsed && (
            <div className='flex items-center justify-center w-full gap-2'>
              {logo ?? (
                <Image
                  src={logoPos}
                  alt='POS Logo'
                  width={150}
                  height={36}
                  className='object-contain'
                  priority
                />
              )}
            </div>
          )}
          {effectiveCollapsed && (
            <Image
              src={posIcon}
              alt='POS Icon'
              width={64}
              height={32}
              className='object-contain'
              priority
            />
          )}
          {isMobile && !effectiveCollapsed && (
            <Button
              variant='ghost'
              size='icon'
              onClick={toggleMobile}
              className='2xl:hidden'
            >
              <ChevronLeft className='h-5 w-5' />
            </Button>
          )}
        </div>
        <ScrollArea className='h-[calc(100vh-8rem)]'>
          <div className={cn('py-4', effectiveCollapsed ? 'px-1' : 'px-2.5')}>
            <div className='space-y-1'>
              {processedRoutes?.map((route, index) => (
                <SidebarItem
                  key={index}
                  icon={route.icon}
                  label={route.label}
                  active={route.active}
                  collapsed={effectiveCollapsed}
                  href={route.href}
                  subItems={route.subItems}
                  onClick={isMobile ? () => setMobileOpen?.(false) : undefined}
                />
              ))}
            </div>
          </div>
        </ScrollArea>

        {/* User Profile */}
        {currentUser && (
          <div
            className={cn(
              'absolute bottom-0 w-full border-t border-slate-200 bg-white',
              effectiveCollapsed ? 'flex justify-center p-2' : 'p-3.5',
            )}
          >
            {effectiveCollapsed ? (
              <Avatar>
                <AvatarImage
                  src={mounted ? (currentUser.image ?? undefined) : undefined}
                  alt={currentUser.name}
                />
                <AvatarFallback>
                  {mounted
                    ? ((currentUser as any).fallback ??
                      getInitials(currentUser.name))
                    : ''}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className='flex items-center gap-3'>
                <Avatar>
                  <AvatarImage
                    src={mounted ? (currentUser.image ?? undefined) : undefined}
                    alt={currentUser.name}
                  />
                  <AvatarFallback>
                    {mounted
                      ? ((currentUser as any).fallback ??
                        getInitials(currentUser.name))
                      : ''}
                  </AvatarFallback>
                </Avatar>
                <div className='w-full overflow-hidden'>
                  <p className='w-full overflow-hidden truncate text-sm font-semibold text-slate-900'>
                    {currentUser.name}
                  </p>
                  <p className='w-full overflow-hidden truncate text-xs text-slate-500'>
                    {currentUser.email}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
};

export default Sidebar;
