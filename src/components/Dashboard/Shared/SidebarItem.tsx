'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

/* ─── shared style tokens ─────────────────────────────────────────────────── */

const itemBase =
  'relative flex items-center gap-3 w-full px-3 py-2.5 text-lg leading-5 transition-colors outline-none select-none';

// Top-level item styles
const topLevelInactive =
  'font-normal text-slate-600 hover:bg-slate-100 hover:text-slate-900 text-base';

const topLevelActive =
  'font-bold bg-[#eef2ff] text-base text-[#003d9b] hover:bg-[#e5eaff] hover:text-[#003d9b]' +
  ' before:absolute before:left-0 before:top-[6px] before:bottom-[6px] before:w-[4px]' +
  ' before:rounded-full before:bg-[#003d9b] before:content-[""]';

// Sub-item styles
const subItemInactive =
  'font-normal text-slate-600 hover:bg-slate-100 hover:text-slate-900 text-[14.5px]';

const subItemActive =
  'font-bold bg-[#eef2ff] text-base text-[#003d9b] hover:bg-[#e5eaff] hover:text-[#003d9b]' +
  ' before:absolute before:left-0 before:top-[6px] before:bottom-[6px] before:w-[4px]' +
  ' before:rounded-full before:bg-[#003d9b] before:content-[""]';

const iconBase =
  'my-0.5 h-10 w-full flex items-center justify-center rounded-lg transition-colors outline-none';

/* ─── component ──────────────────────────────────────────────────────────── */

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

  const isActive =
    active ||
    pathname === href ||
    (hasSubItems && subItems?.some((item) => item.href === pathname));

  // Parent with subItems shows active bg ONLY when a child is active (not when just expanded)
  const isParentActive = isActive;

  /* ── collapsed sidebar ──────────────────────────────────────────────────── */
  if (collapsed) {
    if (hasSubItems) {
      return (
        <TooltipProvider>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      iconBase,
                      isActive
                        ? 'bg-[#eef2ff] text-[#003d9b] hover:bg-[#e5eaff]'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    )}
                  >
                    <Icon className='h-5 w-5' />
                    <span className='sr-only'>{label}</span>
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side='right' className='ml-1'>
                <div className='flex items-center gap-2'>
                  <span>{label}</span>
                  <ChevronRight className='h-3 w-3' />
                </div>
              </TooltipContent>
            </Tooltip>

            <DropdownMenuContent
              side='right'
              align='start'
              className='w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-lg'
              sideOffset={8}
            >
              {subItems.map((item, index) => {
                const SubIcon = item.icon as React.ElementType | undefined;
                const isSubItemActive = item.active || pathname === item.href;

                return (
                  <DropdownMenuItem
                    key={index}
                    className={cn(
                      'cursor-pointer rounded-md text-[0.875rem] transition-colors p-0',
                      isSubItemActive
                        ? 'font-bold bg-[#eef2ff] text-[#003d9b] hover:bg-[#e5eaff] hover:text-[#003d9b] focus:bg-[#eef2ff] focus:text-[#003d9b]'
                        : 'font-normal text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900',
                    )}
                    asChild
                  >
                    {item.href ? (
                      <Link href={item.href} className='flex items-center gap-3 w-full px-3 py-2'>
                        {SubIcon ? <SubIcon className='h-4 w-4' /> : null}
                        <span>{item.label}</span>
                      </Link>
                    ) : (
                      <button className='flex items-center gap-3 w-full px-3 py-2'>
                        {SubIcon ? <SubIcon className='h-4 w-4' /> : null}
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

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              {href ? (
                <Link
                  href={href}
                  className={cn(
                    iconBase,
                    isActive
                      ? 'bg-[#eef2ff] text-[#003d9b] hover:bg-[#e5eaff]'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )}
                >
                  <Icon className='h-5 w-5' />
                  <span className='sr-only'>{label}</span>
                </Link>
              ) : (
                <button
                  className={cn(
                    iconBase,
                    isActive
                      ? 'bg-[#eef2ff] text-[#003d9b] hover:bg-[#e5eaff]'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )}
                  onClick={onClick}
                >
                  <Icon className='h-5 w-5' />
                  <span className='sr-only'>{label}</span>
                </button>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side='right' className='ml-1'>
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  /* ── expanded sidebar ───────────────────────────────────────────────────── */
  return (
    <div>
      {href && !hasSubItems ? (
        <Link
          href={href}
          className={cn(itemBase, isActive ? topLevelActive : topLevelInactive)}
        >
          <Icon className='h-5 w-5 shrink-0' />
          <span>{label}</span>
        </Link>
      ) : (
        <button
          className={cn(itemBase, isParentActive ? topLevelActive : topLevelInactive)}
          onClick={hasSubItems ? () => setExpanded(!expanded) : onClick}
        >
          <Icon className='h-5 w-5 shrink-0' />
          <span>{label}</span>
          {hasSubItems && (
            <span className='ml-auto'>
              {expanded ? (
                <ChevronDown className='h-4 w-4' />
              ) : (
                <ChevronRight className='h-4 w-4' />
              )}
            </span>
          )}
        </button>
      )}

      {hasSubItems && expanded && (
        <div className='ml-4 mt-0.5 border-l border-slate-200 pl-2'>
          {subItems.map((item, index) => {
            const SubIcon = item.icon as React.ElementType | undefined;
            const isSubItemActive = item.active || pathname === item.href;
            const isLast = index === subItems.length - 1;

            return item.href ? (
              <Link
                key={index}
                href={item.href}
                className={cn(
                  itemBase,
                  'py-2',
                  isSubItemActive ? subItemActive : subItemInactive,
                  !isLast && 'border-b border-slate-200',
                )}
              >
                {SubIcon ? <SubIcon className='h-4 w-4 shrink-0' /> : null}
                {item.label}
              </Link>
            ) : (
              <button
                key={index}
                className={cn(
                  itemBase,
                  'py-1.5',
                  isSubItemActive ? subItemActive : subItemInactive,
                  !isLast && 'border-b border-slate-100',
                )}
              >
                {SubIcon ? <SubIcon className='h-4 w-4 shrink-0' /> : null}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SidebarItem;
