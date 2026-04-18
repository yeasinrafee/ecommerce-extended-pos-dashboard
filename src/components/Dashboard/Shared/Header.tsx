"use client";

import React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Bell,
  ChevronLeft,
  HelpCircle,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import InitialsAvatar from "@/components/Common/InitialsAvatar";
import { Badge } from "@/components/ui/badge";
// import { useTheme } from "next-themes";
// import { useAppSelector } from "@/redux/hooks";
// import { RootState } from "@/redux/store";
// import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useAuthStore } from "@/store/useAuthStore";
import { apiClient } from "@/lib/api";
import { AuthRoutes } from "@/routes/auth.route";
import { useNotifications, useMarkNotificationsSeen } from "@/hooks/notification.api";
import { formatDistanceToNow } from "date-fns";

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;

  className?: string;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
}

const Header = ({
  onMenuClick,
  showMenuButton = true,
  className,
  mobileOpen = false,
  setMobileOpen,
  collapsed = false,
  setCollapsed,
}: HeaderProps) => {
  const [internalCollapsed, setInternalCollapsed] = useState(collapsed);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const { data: notificationData } = useNotifications();
  const { mutate: markSeen } = useMarkNotificationsSeen();

  const router = useRouter();
  const clearUser = useAuthStore((state) => state.clearUser);
  const user = useAuthStore((state) => state.user);
  const clearPersisted = () => {
    if (useAuthStore.persist && typeof useAuthStore.persist.clearStorage === 'function') {
      useAuthStore.persist.clearStorage();
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.post(AuthRoutes.logout);
    } catch (error) {
      console.error('Logout request failed', error);
      return;
    }

    clearUser();
    clearPersisted();
    router.replace('/');
    router.refresh();
  };

  useEffect(() => {
    setInternalCollapsed(collapsed);
  }, [collapsed]);

  const toggleCollapse = () => {
    if (setCollapsed) {
      setCollapsed(!collapsed);
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  const handleNotificationOpen = (open: boolean) => {
    if (open && notificationData?.data && notificationData.data.some(n => !n.seen)) {
      const unseenIds = notificationData.data.filter((n) => !n.seen).map((n) => n.id);
      setTimeout(() => {
        markSeen(unseenIds);
      }, 500);
    }
  };

  return (
    <header
      className={cn(
        "flex h-16 items-center justify-between border-b bg-background px-6",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapse}
          className={cn(
            "h-8 w-8 bg-gray-100 text-slate-700 p-0 hidden md:flex cursor-pointer",
            collapsed ? "rotate-180" : ""
          )}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <div>
          {/* <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={`${crumb.label}-${index}`}>
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {index === breadcrumbs.length - 1 || crumb.active ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={crumb.href || crumb.path || "#"}>
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb> */}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu onOpenChange={handleNotificationOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative bg-gray-100 cursor-pointer"
            >
              <Bell className="h-5 w-5" />
              {notificationData?.unseenCount !== undefined && notificationData.unseenCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white">
                  {notificationData.unseenCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 max-h-[320px] overflow-y-auto">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notificationData?.data && notificationData.data.length > 0 ? (
              notificationData.data.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => router.push('/dashboard/orders')}
                  className={cn(
                    "flex flex-col items-start py-2 cursor-pointer",
                    !notification.seen && "bg-slate-50 font-medium"
                  )}
                >
                  <div className="font-semibold">{notification.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                    })}
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        {/* <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className=" bg-gray-100 cursor-pointer"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button> */}

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full cursor-pointer"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={user?.image || undefined}
                  alt={user?.name ?? "user"}
                />
                <AvatarFallback>
                  <InitialsAvatar
                    name={user?.name}
                    className="w-full h-full"
                  />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.name ?? "Unknown User"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email ?? ""}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link href={"/dashboard/profile"} className=" flex items-center gap-2">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            {/* <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Help</span>
            </DropdownMenuItem> */}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-500"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
