"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type CustomTabItem = {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
};

interface CustomTabProps {
  tabs: CustomTabItem[];
  defaultTab?: string;
  className?: string;
  tabListClassName?: string;
  tabButtonClassName?: string;
}

const CustomTab = ({
  tabs,
  defaultTab,
  className,
  tabListClassName,
  tabButtonClassName,
}: CustomTabProps) => {
  const [activeTab, setActiveTab] = React.useState<string>(
    defaultTab ?? tabs[0]?.id ?? "",
  );

  React.useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const current = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  if (!current) return null;

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "flex flex-nowrap overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:flex-wrap lg:overflow-visible",
          tabListClassName,
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === current.id;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "shrink-0 whitespace-nowrap px-4 py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-brand-primary text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                tabButtonClassName,
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div>{current.content}</div>
    </div>
  );
};

export default CustomTab;