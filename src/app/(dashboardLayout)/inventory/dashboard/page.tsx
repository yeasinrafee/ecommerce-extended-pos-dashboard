"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { ApiResponse } from "@/types/auth";
import {
  LuTrendingUp,
  LuTriangleAlert,
  LuArrowLeftRight,
  LuFileText,
  LuPlus,
  LuUsers,
  LuWarehouse,
  LuHistory,
  LuFileSpreadsheet,
  LuPackage,
  LuMapPin,
  LuSlidersHorizontal,
  LuOctagonAlert,
  LuShoppingCart,
  LuArrowRight,
  LuActivity,
} from "react-icons/lu";
import Link from "next/link";
import Loader from "@/components/Common/Loader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface DashboardSummary {
  totalUniqueProducts: number;
  totalPhysicalQuantity: number;
  totalReservedQuantity: number;
  availableQuantity: number;
  totalValueCost: number;
  totalValueRetail: number;
  locationCount: number;
  activePOCount: number;
  activeTransferCount: number;
  lowStockCount: number;
  pendingAdjCount: number;
  pendingDamageCount: number;
}

interface LowStockAlert {
  productId: string;
  productName: string;
  sku: string | null;
  locationId: string;
  locationName: string;
  currentQuantity: number;
  minimumQuantity: number;
  reorderQuantity: number;
}

interface StockMovement {
  id: string;
  productId: string;
  product: { name: string; sku: string };
  location: { name: string };
  movementType: string;
  quantityChanged: number;
  previousQuantity: number;
  currentQuantity: number;
  createdAt: string;
  notes?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const movTypeColor: Record<string, string> = {
  PURCHASE: "bg-green-100 text-green-700",
  TRANSFER_IN: "bg-teal-100 text-teal-700",
  TRANSFER_OUT: "bg-orange-100 text-orange-700",
  SALE: "bg-red-100 text-red-700",
  ADJUSTMENT_IN: "bg-blue-100 text-blue-700",
  ADJUSTMENT_OUT: "bg-purple-100 text-purple-700",
  DAMAGE: "bg-rose-100 text-rose-700",
  CUSTOMER_RETURN: "bg-indigo-100 text-indigo-700",
  SUPPLIER_RETURN: "bg-slate-100 text-slate-700",
};

const movTypeLabel: Record<string, string> = {
  PURCHASE: "Purchase IN",
  TRANSFER_IN: "Transfer IN",
  TRANSFER_OUT: "Transfer OUT",
  SALE: "Sale OUT",
  ADJUSTMENT_IN: "Adj. IN",
  ADJUSTMENT_OUT: "Adj. OUT",
  DAMAGE: "Damage",
  CUSTOMER_RETURN: "Cust. Return",
  SUPPLIER_RETURN: "Supp. Return",
  EXPIRED: "Expired",
};

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function InventoryDashboardPage() {
  const { data: dashRes, isLoading } = useQuery({
    queryKey: ["inventory", "dashboard-summary"],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>(
        "/stocks/reports/inventory-dashboard",
      );
      const d = r.data.data;
      return {
        summary: (d?.summary ?? null) as DashboardSummary | null,
        recentMovements: (Array.isArray(d?.recentMovements)
          ? d.recentMovements
          : []) as StockMovement[],
        topLowStockAlerts: (Array.isArray(d?.topLowStockAlerts)
          ? d.topLowStockAlerts
          : []) as LowStockAlert[],
      };
    },
    refetchInterval: 60_000, // refresh every minute
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader />
      </div>
    );
  }

  const s = dashRes?.summary;
  const movements = dashRes?.recentMovements ?? [];
  const lowStockAlerts = dashRes?.topLowStockAlerts ?? [];

  // ── KPI grid data ─────────────────────────────────────────────────────────────
  const kpiRow1 = [
    {
      label: "Unique Products",
      value: (s?.totalUniqueProducts ?? 0).toLocaleString(),
      sub: `${s?.locationCount ?? 0} active locations`,
      icon: LuPackage,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Physical Stock Qty",
      value: (s?.totalPhysicalQuantity ?? 0).toLocaleString(),
      sub: `${(s?.totalReservedQuantity ?? 0).toLocaleString()} reserved (POS orders)`,
      icon: LuWarehouse,
      color: "bg-violet-50 text-violet-600",
    },
    {
      label: "Available Qty",
      value: (s?.availableQuantity ?? 0).toLocaleString(),
      sub: "Physical − Reserved",
      icon: LuActivity,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Cost Valuation (৳)",
      value: `৳${fmt(s?.totalValueCost ?? 0)}`,
      sub: `Retail: ৳${fmt(s?.totalValueRetail ?? 0)}`,
      icon: LuTrendingUp,
      color: "bg-amber-50 text-amber-600",
    },
  ];

  const kpiRow2 = [
    {
      label: "Low Stock Alerts",
      value: (s?.lowStockCount ?? 0).toLocaleString(),
      sub: "Below safe threshold",
      icon: LuTriangleAlert,
      color: "bg-red-50 text-red-600",
      alert: (s?.lowStockCount ?? 0) > 0,
      href: "/inventory/low-stock",
    },
    {
      label: "Active Purchase Orders",
      value: (s?.activePOCount ?? 0).toLocaleString(),
      sub: "Draft + Pending approval",
      icon: LuFileText,
      color: "bg-blue-50 text-blue-600",
      alert: false,
      href: "/inventory/purchases",
    },
    {
      label: "Active Transfers",
      value: (s?.activeTransferCount ?? 0).toLocaleString(),
      sub: "Draft to In-Transit",
      icon: LuArrowLeftRight,
      color: "bg-teal-50 text-teal-600",
      alert: false,
      href: "/inventory/transfers",
    },
    {
      label: "Pending Actions",
      value: (
        (s?.pendingAdjCount ?? 0) + (s?.pendingDamageCount ?? 0)
      ).toLocaleString(),
      sub: `${s?.pendingAdjCount ?? 0} adj. drafts · ${s?.pendingDamageCount ?? 0} damage drafts`,
      icon: LuSlidersHorizontal,
      color: "bg-orange-50 text-orange-600",
      alert: false,
      href: undefined,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Inventory Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time stock overview — quantities, valuation, pending actions,
            and recent activity.
          </p>
        </div>
        <div className="text-xs text-slate-400">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* ── KPI Row 1: Stock health ──────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiRow1.map(({ label, value, sub, icon: Icon, color }) => (
          <Card
            key={label}
            className="p-4 border-slate-100 shadow-sm flex items-start justify-between gap-3"
          >
            <div className="space-y-0.5 min-w-0">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {label}
              </p>
              <p className="text-xl font-bold text-slate-900 truncate">
                {value}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{sub}</p>
            </div>
            <div className={`p-2.5 rounded-xl shrink-0 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
          </Card>
        ))}
      </div>

      {/* ── KPI Row 2: Operational status ───────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiRow2.map(
          ({ label, value, sub, icon: Icon, color, alert, href }) => (
            <Card
              key={label}
              className={`p-4 border-slate-100 shadow-sm flex flex-col gap-3 ${alert ? "border-red-200 bg-red-50/30" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {label}
                  </p>
                  <p
                    className={`text-xl font-bold ${alert ? "text-red-600" : "text-slate-900"}`}
                  >
                    {value}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{sub}</p>
                </div>
                <div className={`p-2.5 rounded-xl shrink-0 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              {href && (
                <Link
                  href={href}
                  className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 w-fit"
                >
                  View &rarr;
                </Link>
              )}
            </Card>
          ),
        )}
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────────────── */}
      <Card className="p-5 border-slate-100 shadow-sm">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            {
              href: "/inventory/purchases",
              icon: LuShoppingCart,
              label: "New PO",
              color:
                "hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700",
            },
            {
              href: "/inventory/grn",
              icon: LuPackage,
              label: "New GRN",
              color:
                "hover:bg-green-50 hover:border-green-200 hover:text-green-700",
            },
            {
              href: "/inventory/transfers",
              icon: LuArrowLeftRight,
              label: "New Transfer",
              color:
                "hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700",
            },
            {
              href: "/inventory/adjustments",
              icon: LuSlidersHorizontal,
              label: "Adjust Stock",
              color:
                "hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700",
            },
            {
              href: "/inventory/damages",
              icon: LuOctagonAlert,
              label: "Log Damage",
              color:
                "hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700",
            },
            {
              href: "/inventory/reports",
              icon: LuFileSpreadsheet,
              label: "Reports",
              color:
                "hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700",
            },
          ].map(({ href, icon: Icon, label, color }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-200 rounded-xl transition-all group text-slate-600 ${color}`}
            >
              <Icon className="h-5 w-5 mb-1.5" />
              <span className="text-xs font-medium text-center">{label}</span>
            </Link>
          ))}
        </div>
      </Card>

      {/* ── Main two-column grid ─────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Movements */}
        <Card className="p-5 border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <LuHistory className="h-4 w-4 text-slate-400" />
              Recent Stock Movements
            </h2>
            <Link
              href="/inventory/stock-ledger"
              className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
            >
              View All <LuArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {movements.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">
              No recent movements recorded.
            </p>
          ) : (
            <div className="space-y-0 divide-y divide-slate-50">
              {movements.map((mv) => (
                <div
                  key={mv.id}
                  className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`mt-0.5 shrink-0 h-2 w-2 rounded-full ${mv.quantityChanged > 0 ? "bg-green-400" : "bg-red-400"}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {mv.product?.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {mv.location?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge
                      className={`text-[9px] px-1.5 py-0 font-semibold rounded-full border-0 ${movTypeColor[mv.movementType] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {movTypeLabel[mv.movementType] ?? mv.movementType}
                    </Badge>
                    <span
                      className={`text-sm font-bold ${mv.quantityChanged > 0 ? "text-green-600" : "text-red-500"}`}
                    >
                      {mv.quantityChanged > 0
                        ? `+${mv.quantityChanged}`
                        : mv.quantityChanged}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(mv.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Low Stock Alerts */}
        <Card className="p-5 border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <LuTriangleAlert className="h-4 w-4 text-red-500" />
              Low Stock Alerts
              {lowStockAlerts.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-100 text-red-700 text-[9px] font-bold">
                  {dashRes?.summary?.lowStockCount}
                </span>
              )}
            </h2>
            <Link
              href="/inventory/low-stock"
              className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
            >
              Manage <LuArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {lowStockAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mb-2">
                <LuPackage className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                All stock levels healthy
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                No products below safe threshold.
              </p>
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-slate-50 flex-1">
              {lowStockAlerts.map((alert) => {
                const deficit = alert.minimumQuantity - alert.currentQuantity;
                return (
                  <div
                    key={`${alert.productId}-${alert.locationId}`}
                    className="py-3 flex items-start justify-between gap-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {alert.productName}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <LuMapPin className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                        <p className="text-[10px] text-slate-400 truncate">
                          {alert.locationName}
                        </p>
                        {alert.sku && (
                          <span className="text-[10px] text-slate-300">
                            · {alert.sku}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-red-600">
                        {alert.currentQuantity} in stock
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Min: {alert.minimumQuantity}
                      </p>
                      <p className="text-[10px] text-red-500 font-semibold">
                        Deficit: {deficit > 0 ? deficit : 0}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {lowStockAlerts.length > 0 && (
            <div className="pt-4 mt-3 border-t border-slate-100">
              <Link
                href="/inventory/reorder"
                className="flex items-center justify-center gap-1.5 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                <LuShoppingCart className="h-3.5 w-3.5" />
                Generate Reorder Suggestions
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* ── Stock flow quick reference ───────────────────────────────────────── */}
      <Card className="p-5 border-slate-100 shadow-sm">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Inventory Flow Reference
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1.5">
            <p className="font-semibold text-slate-700 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-400 inline-block" />{" "}
              Stock IN events
            </p>
            <ul className="space-y-0.5 text-slate-500 pl-3.5">
              <li>GRN received → +stock (PURCHASE)</li>
              <li>Transfer received → +stock (TRANSFER_IN)</li>
              <li>Adj. positive → +stock (ADJUSTMENT_IN)</li>
              <li>Customer return → +stock (CUSTOMER_RETURN)</li>
            </ul>
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-slate-700 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-400 inline-block" />{" "}
              Stock OUT events
            </p>
            <ul className="space-y-0.5 text-slate-500 pl-3.5">
              <li>POS sale → −stock (SALE)</li>
              <li>Transfer dispatched → −stock (TRANSFER_OUT)</li>
              <li>Adj. negative → −stock (ADJUSTMENT_OUT)</li>
              <li>Damage recorded → −stock (DAMAGE)</li>
              <li>Supplier return → −stock (SUPPLIER_RETURN)</li>
            </ul>
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-slate-700 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-400 inline-block" />{" "}
              Reserved Qty
            </p>
            <ul className="space-y-0.5 text-slate-500 pl-3.5">
              <li>Set when POS order is placed</li>
              <li>Released when order is fulfilled</li>
              <li>Available = Physical − Reserved</li>
              <li>Currently 0 (no pending POS orders)</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
