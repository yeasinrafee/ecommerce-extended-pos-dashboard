"use client";

import type React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  href?: string;
  onClick?: () => void;
  subItems?: {
    icon?: React.ElementType;
    label: string;
    href?: string;
    active?: boolean;
  }[];
}

const SidebarItem = ({
  icon: Icon,
  label,
  active,
  collapsed,
  href,
  onClick,
  subItems,
}: SidebarItemProps) => {
  const [expanded, setExpanded] = useState(false);
  const hasSubItems = subItems && subItems.length > 0;
  const pathname = usePathname();

  useEffect(() => {
    if (hasSubItems && subItems?.some((item) => item.href === pathname)) {
      setExpanded(true);
    }
  }, [pathname, hasSubItems, subItems]);

  const toggleExpand = (e: React.MouseEvent) => {
    if (hasSubItems) {
      e.preventDefault();
      setExpanded(!expanded);
    }
  };

  const isActive =
    active ||
    pathname === href ||
    (hasSubItems && subItems?.some((item) => item.href === pathname));

  if (collapsed) {
    // If has sub-items, use dropdown menu
    if (hasSubItems) {
      return (
        <TooltipProvider>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "w-full h-10 p-0 my-1 relative",
                      isActive && "bg-slate-700 text-white"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="sr-only">{label}</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" className="ml-1">
                <div className="flex items-center gap-2">
                  <span>{label}</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </TooltipContent>
            </Tooltip>

            <DropdownMenuContent
              side="right"
              align="start"
              className="w-48 bg-slate-800 border-slate-700"
              sideOffset={8}
            >
              {subItems.map((item, index) => {
                const SubIcon = item.icon as React.ElementType | undefined;
                const isSubItemActive = item.active || pathname === item.href;

                return (
                  <DropdownMenuItem
                    key={index}
                    className={cn(
                      "text-slate-300 hover:bg-slate-700 hover:text-white focus:bg-slate-700 focus:text-white cursor-pointer",
                      isSubItemActive && "bg-slate-700 text-white"
                    )}
                    asChild
                  >
                    {item.href ? (
                      <Link
                          href={item.href}
                          className="flex items-center gap-3 w-full px-2 py-1.5"
                        >
                          {SubIcon ? <SubIcon className="h-4 w-4" /> : null}
                          <span>{item.label}</span>
                        </Link>
                    ) : (
                      <button className="flex items-center gap-3 w-full px-2 py-1.5">
                        {SubIcon ? <SubIcon className="h-4 w-4" /> : null}
                        <span>{item.label}</span>
                      </button>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipProvider>
      );
    }

    // Simple item without sub-items
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              {href ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "w-full h-10 p-0 my-1",
                    isActive && "bg-slate-700 text-white"
                  )}
                  asChild
                >
                  <Link href={href}>
                    <Icon className="h-5 w-5" />
                    <span className="sr-only">{label}</span>
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "w-full h-10 p-0 my-1",
                    isActive && "bg-slate-700 text-white"
                  )}
                  onClick={onClick}
                >
                  <Icon className="h-5 w-5" />
                  <span className="sr-only">{label}</span>
                </Button>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="ml-1">
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div>
      {href && !hasSubItems ? (
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white",
            isActive && "bg-slate-700 text-white"
          )}
          asChild
        >
          <Link href={href} className="flex items-center gap-3 w-full">
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        </Button>
      ) : (
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white",
            isActive && "bg-slate-700 text-white"
          )}
          onClick={hasSubItems ? toggleExpand : onClick}
        >
          <Icon className="h-5 w-5" />
          <span>{label}</span>
          {hasSubItems && (
            <span className="ml-auto">
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          )}
        </Button>
      )}

      {/* Sub-items 6 -2 */}
      {hasSubItems && expanded && (
        <div className="ml-3 mt-1 border-l border-slate-700 pl-4">
          {subItems.map((item, index) => {
            const SubIcon = item.icon as React.ElementType | undefined;
            const isSubItemActive = item.active || pathname === item.href;

            return (
              <Button
                key={index}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white",
                  isSubItemActive && "bg-slate-700 text-white"
                )}
                asChild
              >
                {item.href ? (
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 w-full pl-4"
                  >
                    {SubIcon ? <SubIcon className="h-4 w-4" /> : null}
                    {item.label}
                  </Link>
                ) : (
                  <button className="flex items-center gap-3 w-full pl-4">
                    {SubIcon ? <SubIcon className="h-4 w-4" /> : null}
                    {item.label}
                  </button>
                )}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SidebarItem;
