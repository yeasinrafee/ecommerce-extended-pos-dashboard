"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { ApiResponse } from "@/types/auth";
import {
  LuFileSpreadsheet,
  LuPrinter,
  LuTrendingUp,
  LuDollarSign,
  LuArrowLeftRight,
  LuOctagonAlert,
  LuActivity,
  LuSlidersHorizontal,
  LuTriangleAlert,
  LuPackage,
} from "react-icons/lu";
import Loader from "@/components/Common/Loader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PaginationControl } from "@/components/Common/Pagination";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ValuationSummary {
  totalUniqueProducts: number;
  totalPhysicalQuantity: number;
  totalReservedQuantity: number;
  totalValueCost: number;
  totalValueRetail: number;
}
interface LocationBreakdown {
  name: string;
  code: string;
  distinctProducts: number;
  quantity: number;
  reservedQty: number;
  costValuation: number;
  retailValuation: number;
}
interface ProductBreakdown {
  productId: string;
  productName: string;
  sku: string | null;
  totalQty: number;
  totalReserved: number;
  costValuation: number;
  retailValuation: number;
  locationCount: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const todayStr = () => new Date().toISOString().slice(0, 10);

// Excel export as CSV — UTF-8 BOM + ISO dates prevents #### in Excel, no format-mismatch warning
function downloadExcel(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const quote = (v: string | number | null | undefined) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;

  const csv =
    "\uFEFF" +
    [
      headers.map(quote).join(","),
      ...rows.map((r) => r.map(quote).join(",")),
    ].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : filename + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}

const movTypeColor: Record<string, string> = {
  IN: "bg-green-100 text-green-700",
  OUT: "bg-red-100 text-red-700",
  ADJUSTMENT: "bg-blue-100 text-blue-700",
  TRANSFER_IN: "bg-teal-100 text-teal-700",
  TRANSFER_OUT: "bg-orange-100 text-orange-700",
  DAMAGE: "bg-rose-100 text-rose-700",
};

const statusColor: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700",
  DRAFT: "bg-yellow-100 text-yellow-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  PENDING: "bg-blue-100 text-blue-700",
  APPROVED: "bg-indigo-100 text-indigo-700",
  IN_TRANSIT: "bg-orange-100 text-orange-700",
};

const LIMIT = 20;

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function InventoryReportsPage() {
  const [activeTab, setActiveTab] = useState("valuation");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [movPage, setMovPage] = useState(1);
  const [trfPage, setTrfPage] = useState(1);
  const [dmgPage, setDmgPage] = useState(1);
  const [adjPage, setAdjPage] = useState(1);
  const [lstPage, setLstPage] = useState(1);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: locationsRes } = useQuery({
    queryKey: ["reports", "locations"],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any[]>>(
        "/stocks/locations/get-all",
      );
      return (r.data.data ?? []) as any[];
    },
  });

  const { data: valuationData, isLoading: isLoadingValuation } = useQuery({
    queryKey: ["reports", "valuation", selectedLocation],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>(
        "/stocks/reports/current",
        {
          params: { locationId: selectedLocation || undefined },
        },
      );
      const d = r.data.data;
      return {
        summary: (d?.summary ?? null) as ValuationSummary | null,
        locationBreakdown: (Array.isArray(d?.locationBreakdown)
          ? d.locationBreakdown
          : []) as LocationBreakdown[],
        productBreakdown: (Array.isArray(d?.productBreakdown)
          ? d.productBreakdown
          : []) as ProductBreakdown[],
      };
    },
  });

  const { data: movementsData, isLoading: isLoadingMovements } = useQuery({
    queryKey: [
      "reports",
      "movements",
      movPage,
      selectedLocation,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>(
        "/stocks/reports/movements",
        {
          params: {
            page: movPage,
            limit: LIMIT,
            locationId: selectedLocation || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          },
        },
      );
      const p = r.data;
      return {
        data: (Array.isArray(p.data) ? p.data : []) as any[],
        meta: p.meta ?? { page: 1, totalPages: 1, total: 0, limit: LIMIT },
      };
    },
    enabled: activeTab === "movements",
  });

  const { data: transfersData, isLoading: isLoadingTransfers } = useQuery({
    queryKey: [
      "reports",
      "transfers",
      trfPage,
      selectedLocation,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>(
        "/stocks/reports/transfers",
        {
          params: {
            page: trfPage,
            limit: LIMIT,
            sourceLocationId: selectedLocation || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          },
        },
      );
      const p = r.data;
      return {
        data: (Array.isArray(p.data) ? p.data : []) as any[],
        meta: p.meta ?? { page: 1, totalPages: 1, total: 0, limit: LIMIT },
      };
    },
    enabled: activeTab === "transfers",
  });

  const { data: damagesData, isLoading: isLoadingDamages } = useQuery({
    queryKey: [
      "reports",
      "damages",
      dmgPage,
      selectedLocation,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>(
        "/stocks/reports/damages",
        {
          params: {
            page: dmgPage,
            limit: LIMIT,
            locationId: selectedLocation || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          },
        },
      );
      const p = r.data;
      return {
        data: (Array.isArray(p.data) ? p.data : []) as any[],
        meta: p.meta ?? { page: 1, totalPages: 1, total: 0, limit: LIMIT },
      };
    },
    enabled: activeTab === "damages",
  });

  const { data: adjustmentsData, isLoading: isLoadingAdjustments } = useQuery({
    queryKey: [
      "reports",
      "adjustments",
      adjPage,
      selectedLocation,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>(
        "/stocks/reports/adjustments",
        {
          params: {
            page: adjPage,
            limit: LIMIT,
            locationId: selectedLocation || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          },
        },
      );
      const p = r.data;
      return {
        data: (Array.isArray(p.data) ? p.data : []) as any[],
        meta: p.meta ?? { page: 1, totalPages: 1, total: 0, limit: LIMIT },
      };
    },
    enabled: activeTab === "adjustments",
  });

  const { data: lowStockData, isLoading: isLoadingLowStock } = useQuery({
    queryKey: ["reports", "lowstock", lstPage, selectedLocation],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>(
        "/stocks/low-stock-alerts",
        {
          params: {
            page: lstPage,
            limit: LIMIT,
            locationId: selectedLocation || undefined,
          },
        },
      );
      const p = r.data;
      return {
        data: (Array.isArray(p.data) ? p.data : []) as any[],
        meta: p.meta ?? { page: 1, totalPages: 1, total: 0, limit: LIMIT },
      };
    },
    enabled: activeTab === "lowstock",
  });

  const locName = (id: string) =>
    locationsRes?.find((l: any) => l.id === id)?.name ?? id;

  // ── PDF Export ────────────────────────────────────────────────────────────────
  const exportPDF = async (tab: string) => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const tabLabel: Record<string, string> = {
      valuation: "Stock Valuation Report",
      movements: "Stock Movement Ledger",
      transfers: "Stock Transfer Report",
      damages: "Damage / Waste Report",
      adjustments: "Stock Adjustment Report",
      lowstock: "Low Stock Alert Report",
    };

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const pageW = doc.internal.pageSize.getWidth();

    // ── Document header (Word-like plain style)
    let y = 18;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("INVENTORY MANAGEMENT REPORT", 14, y);
    y += 8;
    doc.setFontSize(12);
    doc.text(tabLabel[tab] ?? "Report", 14, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y);
    y += 5;
    if (selectedLocation) {
      doc.text(`Location Filter: ${locName(selectedLocation)}`, 14, y);
      y += 5;
    }
    if (startDate) {
      doc.text(`From: ${startDate}`, 14, y);
      y += 5;
    }
    if (endDate) {
      doc.text(`To:   ${endDate}`, 14, y);
      y += 5;
    }

    // Divider line
    doc.setLineWidth(0.4);
    doc.line(14, y + 1, pageW - 14, y + 1);
    y += 5;

    // Plain black-and-white Word-like table style — no background colors
    const tableDefaults = {
      startY: y,
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        textColor: [0, 0, 0] as [number, number, number],
        fillColor: [255, 255, 255] as [number, number, number],
        lineColor: [0, 0, 0] as [number, number, number],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [255, 255, 255] as [number, number, number],
        textColor: [0, 0, 0] as [number, number, number],
        fontStyle: "bold" as const,
        lineColor: [0, 0, 0] as [number, number, number],
        lineWidth: 0.3,
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255] as [number, number, number],
      },
      tableLineColor: [0, 0, 0] as [number, number, number],
      tableLineWidth: 0.1,
    };

    if (tab === "valuation") {
      const summary = valuationData?.summary;
      const locList = valuationData?.locationBreakdown ?? [];
      const prodList = valuationData?.productBreakdown ?? [];

      // Summary box
      if (summary) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Summary", 14, tableDefaults.startY);
        autoTable(doc, {
          ...tableDefaults,
          startY: tableDefaults.startY + 3,
          head: [["Metric", "Value"]],
          body: [
            ["Total Unique Products", summary.totalUniqueProducts],
            ["Total Physical Stock Qty", summary.totalPhysicalQuantity],
            ["Total Reserved Qty", summary.totalReservedQuantity],
            ["Total Cost Valuation (BDT)", fmt(summary.totalValueCost)],
            ["Total Retail Valuation (BDT)", fmt(summary.totalValueRetail)],
          ],
          tableWidth: 110,
        });
      }

      const afterSummary = (doc as any).lastAutoTable?.finalY ?? y;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Location Breakdown", 14, afterSummary + 8);
      autoTable(doc, {
        ...tableDefaults,
        startY: afterSummary + 12,
        head: [
          [
            "Location",
            "Code",
            "Stock Qty",
            "Reserved",
            "Cost Value (BDT)",
            "Retail Value (BDT)",
          ],
        ],
        body: locList.map((l) => [
          l.name,
          l.code,
          l.quantity,
          l.reservedQty,
          fmt(l.costValuation),
          fmt(l.retailValuation),
        ]),
      });

      doc.addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Product Breakdown", 14, 15);
      autoTable(doc, {
        ...tableDefaults,
        startY: 20,
        head: [
          [
            "Product Name",
            "SKU",
            "Total Qty",
            "Reserved",
            "Cost Value (BDT)",
            "Retail Value (BDT)",
            "Locations",
          ],
        ],
        body: prodList.map((p) => [
          p.productName,
          p.sku ?? "—",
          p.totalQty,
          p.totalReserved,
          fmt(p.costValuation),
          fmt(p.retailValuation),
          p.locationCount,
        ]),
      });
    } else if (tab === "movements") {
      autoTable(doc, {
        ...tableDefaults,
        head: [
          [
            "Date",
            "Product",
            "SKU",
            "Location",
            "Movement Type",
            "Qty Change",
            "Performed By",
          ],
        ],
        body: (movementsData?.data ?? []).map((m: any) => [
          new Date(m.createdAt).toLocaleDateString(),
          m.product?.name ?? "",
          m.product?.sku ?? "-",
          m.location?.name ?? "",
          m.movementType ?? "",
          m.quantityChanged > 0 ? `+${m.quantityChanged}` : m.quantityChanged,
          m.performer?.email ?? "",
        ]),
      });
    } else if (tab === "transfers") {
      autoTable(doc, {
        ...tableDefaults,
        head: [
          [
            "Date",
            "Transfer #",
            "From Location",
            "To Location",
            "Status",
            "Created By",
          ],
        ],
        body: (transfersData?.data ?? []).map((t: any) => [
          new Date(t.createdAt).toLocaleDateString(),
          t.transferNumber ?? t.id?.slice(-8) ?? "",
          t.sourceLocation?.name ?? "",
          t.destinationLocation?.name ?? "",
          t.status ?? "",
          t.creator?.email ?? "",
        ]),
      });
    } else if (tab === "damages") {
      autoTable(doc, {
        ...tableDefaults,
        head: [
          [
            "Date",
            "Reference #",
            "Location",
            "Status",
            "Total Qty",
            "Total Loss (BDT)",
            "Created By",
          ],
        ],
        body: (damagesData?.data ?? []).map((d: any) => [
          new Date(d.createdAt).toLocaleDateString(),
          d.damageNumber ?? d.id?.slice(-8) ?? "",
          d.location?.name ?? "",
          d.status ?? "",
          (d.items ?? []).reduce(
            (sum: number, item: any) => sum + (item.quantity || 0),
            0,
          ),
          `BDT ${fmt(d.totalLossValuation ?? 0)}`,
          d.creator?.email ?? "",
        ]),
      });
    } else if (tab === "adjustments") {
      autoTable(doc, {
        ...tableDefaults,
        head: [
          [
            "Date",
            "Reference #",
            "Location",
            "Status",
            "Reason",
            "Added Qty",
            "Removed Qty",
            "Net Change",
            "Created By",
          ],
        ],
        body: (adjustmentsData?.data ?? []).map((a: any) => [
          new Date(a.createdAt).toLocaleDateString(),
          a.adjustmentNumber ?? "",
          a.locationName ?? "",
          a.status ?? "",
          a.reason ?? "",
          a.totalAdded ?? 0,
          a.totalRemoved ?? 0,
          (a.totalAdded ?? 0) - (a.totalRemoved ?? 0),
          a.createdBy ?? "",
        ]),
      });
    } else if (tab === "lowstock") {
      autoTable(doc, {
        ...tableDefaults,
        head: [
          [
            "Product",
            "SKU",
            "Location",
            "Current Qty",
            "Min Threshold",
            "Reorder Qty",
            "Deficit",
          ],
        ],
        body: (lowStockData?.data ?? []).map((l: any) => [
          l.productName ?? "",
          l.sku ?? "—",
          l.locationName ?? "",
          l.currentQuantity,
          l.minimumQuantity,
          l.reorderQuantity,
          Math.max(0, l.minimumQuantity - l.currentQuantity),
        ]),
      });
    }

    // Page numbers
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageW - 14,
        doc.internal.pageSize.getHeight() - 8,
        { align: "right" },
      );
      doc.text(
        "Inventory Management System",
        14,
        doc.internal.pageSize.getHeight() - 8,
      );
      doc.setTextColor(0);
    }

    doc.save(`inventory-${tab}-report-${todayStr()}.pdf`);
  };

  // ── Excel Export (HTML table format — x:str forces text, no #### on dates) ────
  const exportExcel = (tab: string) => {
    const filename = `inventory-${tab}-${todayStr()}`;
    const fmtDate = (d: string) => new Date(d).toISOString().slice(0, 10); // YYYY-MM-DD
    if (tab === "valuation") {
      const locList = valuationData?.locationBreakdown ?? [];
      downloadExcel(
        filename,
        [
          "Location",
          "Code",
          "Stock Qty",
          "Reserved Qty",
          "Cost Valuation (BDT)",
          "Retail Valuation (BDT)",
        ],
        locList.map((l) => [
          l.name,
          l.code,
          l.quantity,
          l.reservedQty,
          l.costValuation,
          l.retailValuation,
        ]),
      );
    } else if (tab === "movements") {
      downloadExcel(
        filename,
        [
          "Date",
          "Product",
          "SKU",
          "Location",
          "Movement Type",
          "Qty Change",
          "Performed By",
        ],
        (movementsData?.data ?? []).map((m: any) => [
          fmtDate(m.createdAt),
          m.product?.name,
          m.product?.sku,
          m.location?.name,
          m.movementType,
          m.quantityChanged,
          m.performer?.email,
        ]),
      );
    } else if (tab === "transfers") {
      downloadExcel(
        filename,
        ["Date", "Transfer #", "From", "To", "Status", "Created By"],
        (transfersData?.data ?? []).map((t: any) => [
          fmtDate(t.createdAt),
          t.transferNumber ?? t.id,
          t.sourceLocation?.name,
          t.destinationLocation?.name,
          t.status,
          t.creator?.email,
        ]),
      );
    } else if (tab === "damages") {
      downloadExcel(
        filename,
        [
          "Date",
          "Reference #",
          "Location",
          "Status",
          "Total Qty",
          "Total Loss (BDT)",
          "Created By",
        ],
        (damagesData?.data ?? []).map((d: any) => [
          fmtDate(d.createdAt),
          d.damageNumber ?? d.id,
          d.location?.name,
          d.status,
          (d.items ?? []).reduce(
            (sum: number, item: any) => sum + (item.quantity || 0),
            0,
          ),
          d.totalLossValuation,
          d.creator?.email,
        ]),
      );
    } else if (tab === "adjustments") {
      downloadExcel(
        filename,
        [
          "Date",
          "Reference #",
          "Location",
          "Status",
          "Reason",
          "Added Qty",
          "Removed Qty",
          "Net Change",
          "Created By",
        ],
        (adjustmentsData?.data ?? []).map((a: any) => [
          fmtDate(a.createdAt),
          a.adjustmentNumber,
          a.locationName,
          a.status,
          a.reason,
          a.totalAdded ?? 0,
          a.totalRemoved ?? 0,
          (a.totalAdded ?? 0) - (a.totalRemoved ?? 0),
          a.createdBy,
        ]),
      );
    } else if (tab === "lowstock") {
      downloadExcel(
        filename,
        [
          "Product",
          "SKU",
          "Location",
          "Current Qty",
          "Min Threshold",
          "Reorder Qty",
          "Deficit",
        ],
        (lowStockData?.data ?? []).map((l: any) => [
          l.productName,
          l.sku,
          l.locationName,
          l.currentQuantity,
          l.minimumQuantity,
          l.reorderQuantity,
          Math.max(0, l.minimumQuantity - l.currentQuantity),
        ]),
      );
    }
  };

  // ── Reusable: empty state ─────────────────────────────────────────────────────
  const EmptyState = ({ icon: Icon, text }: { icon: any; text: string }) => (
    <div className="p-16 text-center text-slate-400">
      <Icon className="h-10 w-10 mx-auto mb-3 text-slate-200" />
      <p className="text-sm font-medium">{text}</p>
    </div>
  );

  // ── Reusable: pagination row ──────────────────────────────────────────────────
  const PagRow = ({
    meta,
    onChange,
  }: {
    meta: any;
    onChange: (p: number) => void;
  }) =>
    meta?.totalPages > 1 ? (
      <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>
          Page {meta.page} of {meta.totalPages} &mdash; {meta.total} records
        </span>
        <PaginationControl
          currentPage={meta.page}
          totalPages={meta.totalPages}
          onPageChange={onChange}
        />
      </div>
    ) : null;

  // ── Reusable: export buttons ────────────────────────────────────────────
  const ExportBar = ({ tab }: { tab: string }) => (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportExcel(tab)}
        className="text-xs rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5"
      >
        📊 Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportPDF(tab)}
        className="text-xs rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5"
      >
        <LuPrinter className="h-3.5 w-3.5" /> PDF
      </Button>
    </div>
  );

  // ── JSX ───────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <LuFileSpreadsheet className="h-6 w-6 text-emerald-600" />
            Inventory Reports
          </h1>
          <p className="text-xs text-slate-500">
            Valuation, movements, transfers, damages, adjustments and low-stock
            — export as Excel or PDF.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">
              Location
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none px-3"
            >
              <option value="">All Locations</option>
              {locationsRes?.map((loc: any) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none px-3"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none px-3"
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs border-slate-200"
              onClick={() => {
                setSelectedLocation("");
                setStartDate("");
                setEndDate("");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full space-y-4"
      >
        <TabsList className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex-wrap gap-1 h-auto">
          {[
            { value: "valuation", label: "Valuation", icon: LuDollarSign },
            { value: "movements", label: "Movements", icon: LuActivity },
            { value: "transfers", label: "Transfers", icon: LuArrowLeftRight },
            { value: "damages", label: "Damages", icon: LuOctagonAlert },
            {
              value: "adjustments",
              label: "Adjustments",
              icon: LuSlidersHorizontal,
            },
            { value: "lowstock", label: "Low Stock", icon: LuTriangleAlert },
          ].map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="rounded-lg text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Tab 1: Stock Valuation ──────────────────────────────────────────── */}
        <TabsContent value="valuation" className="space-y-4 outline-none">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Stock Valuation Report
            </h2>
            <ExportBar tab="valuation" />
          </div>

          {isLoadingValuation ? (
            <div className="flex h-64 items-center justify-center">
              <Loader />
            </div>
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  {
                    label: "Unique Products",
                    value: valuationData?.summary?.totalUniqueProducts ?? 0,
                    icon: LuPackage,
                    color: "bg-blue-50 text-blue-600",
                  },
                  {
                    label: "Total Stock Qty",
                    value: (
                      valuationData?.summary?.totalPhysicalQuantity ?? 0
                    ).toLocaleString(),
                    icon: LuActivity,
                    color: "bg-violet-50 text-violet-600",
                  },
                  {
                    label: "Reserved Qty",
                    value: (
                      valuationData?.summary?.totalReservedQuantity ?? 0
                    ).toLocaleString(),
                    icon: LuPackage,
                    color: "bg-orange-50 text-orange-600",
                  },
                  {
                    label: "Cost Value (BDT)",
                    value: `BDT ${fmt(valuationData?.summary?.totalValueCost)}`,
                    icon: LuDollarSign,
                    color: "bg-emerald-50 text-emerald-600",
                  },
                  {
                    label: "Retail Value (BDT)",
                    value: `BDT ${fmt(valuationData?.summary?.totalValueRetail)}`,
                    icon: LuTrendingUp,
                    color: "bg-indigo-50 text-indigo-600",
                  },
                ].map(({ label, value, icon: Icon, color }) => (
                  <Card
                    key={label}
                    className="p-4 border-slate-100 shadow-sm flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        {label}
                      </p>
                      <p className="text-lg font-bold text-slate-900 mt-0.5">
                        {value}
                      </p>
                    </div>
                    <div className={`p-2.5 rounded-xl ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </Card>
                ))}
              </div>

              {/* Location table */}
              <Card className="border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Location Breakdown
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase">
                      <tr>
                        <th className="p-3">Location</th>
                        <th className="p-3">Code</th>
                        <th className="p-3 text-center">Stock Qty</th>
                        <th className="p-3 text-center">Reserved</th>
                        <th className="p-3 text-right">Cost Value (BDT)</th>
                        <th className="p-3 text-right">Retail Value (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(valuationData?.locationBreakdown ?? []).length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="p-10 text-center text-slate-400"
                          >
                            No data
                          </td>
                        </tr>
                      ) : (
                        (valuationData?.locationBreakdown ?? []).map(
                          (item, i) => (
                            <tr
                              key={i}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              <td className="p-3 font-semibold text-slate-900">
                                {item.name}
                              </td>
                              <td className="p-3 font-mono text-slate-500">
                                {item.code}
                              </td>
                              <td className="p-3 text-center font-semibold">
                                {item.quantity}
                              </td>
                              <td className="p-3 text-center text-slate-400">
                                {item.reservedQty}
                              </td>
                              <td className="p-3 text-right font-bold text-slate-900">
                                {fmt(item.costValuation)}
                              </td>
                              <td className="p-3 text-right font-bold text-indigo-600">
                                {fmt(item.retailValuation)}
                              </td>
                            </tr>
                          ),
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Product table */}
              <Card className="border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Product Breakdown
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase">
                      <tr>
                        <th className="p-3">Product</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3 text-center">Total Qty</th>
                        <th className="p-3 text-center">Reserved</th>
                        <th className="p-3 text-right">Cost Value (BDT)</th>
                        <th className="p-3 text-right">Retail Value (BDT)</th>
                        <th className="p-3 text-center">Locations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(valuationData?.productBreakdown ?? []).length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="p-10 text-center text-slate-400"
                          >
                            No data
                          </td>
                        </tr>
                      ) : (
                        (valuationData?.productBreakdown ?? []).map(
                          (item, i) => (
                            <tr
                              key={i}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              <td className="p-3 font-semibold text-slate-900">
                                {item.productName}
                              </td>
                              <td className="p-3 font-mono text-slate-400">
                                {item.sku ?? (
                                  <span className="italic text-slate-300">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center font-semibold">
                                {item.totalQty}
                              </td>
                              <td className="p-3 text-center text-slate-400">
                                {item.totalReserved}
                              </td>
                              <td className="p-3 text-right font-bold text-slate-900">
                                {fmt(item.costValuation)}
                              </td>
                              <td className="p-3 text-right font-bold text-indigo-600">
                                {fmt(item.retailValuation)}
                              </td>
                              <td className="p-3 text-center text-slate-500">
                                {item.locationCount}
                              </td>
                            </tr>
                          ),
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── Tab 2: Movements ───────────────────────────────────────────────── */}
        <TabsContent value="movements" className="space-y-4 outline-none">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Stock Movement Ledger
            </h2>
            <ExportBar tab="movements" />
          </div>
          <Card className="border-slate-100 shadow-sm overflow-hidden">
            {isLoadingMovements ? (
              <div className="flex h-64 items-center justify-center">
                <Loader />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase">
                      <tr>
                        <th className="p-3">Date &amp; Time</th>
                        <th className="p-3">Product</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Location</th>
                        <th className="p-3">Type</th>
                        <th className="p-3 text-center">Qty Change</th>
                        <th className="p-3">Performed By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(movementsData?.data ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={6}>
                            <EmptyState
                              icon={LuActivity}
                              text="No movement records found."
                            />
                          </td>
                        </tr>
                      ) : (
                        (movementsData?.data ?? []).map((m: any) => (
                          <tr
                            key={m.id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="p-3 text-slate-500 whitespace-nowrap">
                              {new Date(m.createdAt).toLocaleDateString()}
                              <br />
                              <span className="text-[10px] text-slate-300">
                                {new Date(m.createdAt).toLocaleTimeString()}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-slate-900">
                              {m.product?.name ?? "—"}
                            </td>
                            <td className="p-3 font-mono text-slate-400">
                              {m.product?.sku ?? "—"}
                            </td>
                            <td className="p-3">{m.location?.name ?? "—"}</td>
                            <td className="p-3">
                              <Badge
                                className={`text-[10px] px-2 py-0.5 font-semibold rounded-full ${movTypeColor[m.movementType] ?? "bg-slate-100 text-slate-600"}`}
                              >
                                {m.movementType}
                              </Badge>
                            </td>
                            <td className="p-3 text-center font-bold">
                              <span
                                className={
                                  m.quantityChanged > 0
                                    ? "text-green-600"
                                    : "text-red-500"
                                }
                              >
                                {m.quantityChanged > 0
                                  ? `+${m.quantityChanged}`
                                  : m.quantityChanged}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500">
                              {m.performer?.email ?? "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <PagRow meta={movementsData?.meta} onChange={setMovPage} />
              </>
            )}
          </Card>
        </TabsContent>

        {/* ── Tab 3: Transfers ───────────────────────────────────────────────── */}
        <TabsContent value="transfers" className="space-y-4 outline-none">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Stock Transfer Report
            </h2>
            <ExportBar tab="transfers" />
          </div>
          <Card className="border-slate-100 shadow-sm overflow-hidden">
            {isLoadingTransfers ? (
              <div className="flex h-64 items-center justify-center">
                <Loader />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Transfer #</th>
                        <th className="p-3">From</th>
                        <th className="p-3">To</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3">Created By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(transfersData?.data ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={6}>
                            <EmptyState
                              icon={LuArrowLeftRight}
                              text="No transfer records found."
                            />
                          </td>
                        </tr>
                      ) : (
                        (transfersData?.data ?? []).map((t: any) => (
                          <tr
                            key={t.id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="p-3 text-slate-500">
                              {new Date(t.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-3 font-mono font-semibold text-slate-700">
                              {t.transferNumber ?? t.id?.slice(-8)}
                            </td>
                            <td className="p-3">
                              {t.sourceLocation?.name ?? "—"}
                            </td>
                            <td className="p-3">
                              {t.destinationLocation?.name ?? "—"}
                            </td>
                            <td className="p-3 text-center">
                              <Badge
                                className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor[t.status] ?? "bg-slate-100 text-slate-600"}`}
                              >
                                {t.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-slate-500">
                              {t.creator?.email ?? "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <PagRow meta={transfersData?.meta} onChange={setTrfPage} />
              </>
            )}
          </Card>
        </TabsContent>

        {/* ── Tab 4: Damages ─────────────────────────────────────────────────── */}
        <TabsContent value="damages" className="space-y-4 outline-none">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Damage / Waste Report
            </h2>
            <ExportBar tab="damages" />
          </div>
          <Card className="border-slate-100 shadow-sm overflow-hidden">
            {isLoadingDamages ? (
              <div className="flex h-64 items-center justify-center">
                <Loader />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Reference #</th>
                        <th className="p-3">Location</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Total Qty</th>
                        <th className="p-3 text-right">Total Loss (BDT)</th>
                        <th className="p-3">Created By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(damagesData?.data ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={7}>
                            <EmptyState
                              icon={LuOctagonAlert}
                              text="No damage records found."
                            />
                          </td>
                        </tr>
                      ) : (
                        (damagesData?.data ?? []).map((d: any) => (
                          <tr
                            key={d.id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="p-3 text-slate-500">
                              {new Date(d.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-3 font-mono font-semibold text-slate-700">
                              {d.damageNumber ?? d.id?.slice(-8)}
                            </td>
                            <td className="p-3">{d.location?.name ?? "—"}</td>
                            <td className="p-3 text-center">
                              <Badge
                                className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor[d.status] ?? "bg-slate-100 text-slate-600"}`}
                              >
                                {d.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-center font-semibold text-slate-700">
                              {(d.items ?? []).reduce(
                                (sum: number, item: any) =>
                                  sum + (item.quantity || 0),
                                0,
                              )}
                            </td>
                            <td className="p-3 text-right font-bold text-red-600">
                              BDT {fmt(d.totalLossValuation ?? 0)}
                            </td>
                            <td className="p-3 text-slate-500">
                              {d.creator?.email ?? "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <PagRow meta={damagesData?.meta} onChange={setDmgPage} />
              </>
            )}
          </Card>
        </TabsContent>

        {/* ── Tab 5: Adjustments ─────────────────────────────────────────────── */}
        <TabsContent value="adjustments" className="space-y-4 outline-none">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Stock Adjustment Report
            </h2>
            <ExportBar tab="adjustments" />
          </div>
          <Card className="border-slate-100 shadow-sm overflow-hidden">
            {isLoadingAdjustments ? (
              <div className="flex h-64 items-center justify-center">
                <Loader />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Reference #</th>
                        <th className="p-3">Location</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3 text-center">Added Qty</th>
                        <th className="p-3 text-center">Removed Qty</th>
                        <th className="p-3 text-center">Net Change</th>
                        <th className="p-3">Created By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(adjustmentsData?.data ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={8}>
                            <EmptyState
                              icon={LuSlidersHorizontal}
                              text="No adjustment records found."
                            />
                          </td>
                        </tr>
                      ) : (
                        (adjustmentsData?.data ?? []).map((a: any) => (
                          <tr
                            key={a.id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="p-3 text-slate-500">
                              {new Date(a.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-3 font-mono font-semibold text-slate-700">
                              {a.adjustmentNumber ?? "—"}
                            </td>
                            <td className="p-3">{a.locationName ?? "—"}</td>
                            <td className="p-3 text-center">
                              <Badge
                                className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor[a.status] ?? "bg-slate-100 text-slate-600"}`}
                              >
                                {a.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-slate-500 truncate max-w-[120px]">
                              {a.reason ?? "—"}
                            </td>
                            <td className="p-3 text-center font-bold text-green-600">
                              {a.totalAdded > 0 ? `+${a.totalAdded}` : "—"}
                            </td>
                            <td className="p-3 text-center font-bold text-red-500">
                              {a.totalRemoved > 0 ? `-${a.totalRemoved}` : "—"}
                            </td>
                            <td className="p-3 text-center font-semibold text-slate-700">
                              {(a.totalAdded ?? 0) - (a.totalRemoved ?? 0) > 0
                                ? `+${(a.totalAdded ?? 0) - (a.totalRemoved ?? 0)}`
                                : (a.totalAdded ?? 0) - (a.totalRemoved ?? 0)}
                            </td>
                            <td className="p-3 text-slate-500">
                              {a.createdBy ?? "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <PagRow meta={adjustmentsData?.meta} onChange={setAdjPage} />
              </>
            )}
          </Card>
        </TabsContent>

        {/* ── Tab 6: Low Stock ───────────────────────────────────────────────── */}
        <TabsContent value="lowstock" className="space-y-4 outline-none">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Low Stock Alert Report
            </h2>
            <ExportBar tab="lowstock" />
          </div>
          <Card className="border-slate-100 shadow-sm overflow-hidden">
            {isLoadingLowStock ? (
              <div className="flex h-64 items-center justify-center">
                <Loader />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase">
                      <tr>
                        <th className="p-3">Product</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Location</th>
                        <th className="p-3 text-center">Current Qty</th>
                        <th className="p-3 text-center">Min Threshold</th>
                        <th className="p-3 text-center">Reorder Qty</th>
                        <th className="p-3 text-center">Deficit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(lowStockData?.data ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={7}>
                            <EmptyState
                              icon={LuTriangleAlert}
                              text="All stock levels are within safe thresholds."
                            />
                          </td>
                        </tr>
                      ) : (
                        (lowStockData?.data ?? []).map(
                          (item: any, i: number) => {
                            const deficit =
                              item.minimumQuantity - item.currentQuantity;
                            return (
                              <tr
                                key={i}
                                className="hover:bg-slate-50 transition-colors"
                              >
                                <td className="p-3 font-semibold text-slate-900">
                                  {item.productName}
                                </td>
                                <td className="p-3 font-mono text-slate-400">
                                  {item.sku ?? (
                                    <span className="italic text-slate-300">
                                      —
                                    </span>
                                  )}
                                </td>
                                <td className="p-3">{item.locationName}</td>
                                <td className="p-3 text-center font-bold text-red-600">
                                  {item.currentQuantity}
                                </td>
                                <td className="p-3 text-center text-slate-500">
                                  {item.minimumQuantity}
                                </td>
                                <td className="p-3 text-center">
                                  <span className="bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-lg">
                                    {item.reorderQuantity}
                                  </span>
                                </td>
                                <td className="p-3 text-center font-bold">
                                  {deficit > 0 ? (
                                    <span className="text-red-600">
                                      -{deficit}
                                    </span>
                                  ) : (
                                    <span className="text-amber-500">0</span>
                                  )}
                                </td>
                              </tr>
                            );
                          },
                        )
                      )}
                    </tbody>
                  </table>
                </div>
                <PagRow meta={lowStockData?.meta} onChange={setLstPage} />
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
