"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { ApiResponse } from "@/types/auth";
import { LuFileSpreadsheet, LuPrinter } from "react-icons/lu";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PaginationControl } from "@/components/Common/Pagination";

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const todayStr = () => new Date().toISOString().slice(0, 10);

const defaultStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return d.toISOString().slice(0, 10);
};

function downloadCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][], dateColIdx: number[] = []) {
  const q = (v: string | number | null | undefined, isDate = false) => {
    const s = String(v ?? "").replace(/"/g, '""');
    return isDate ? `"'${s}"` : `"${s}"`;
  };
  const csv = "\uFEFF" + [
    headers.map((h) => q(h)).join(","),
    ...rows.map((r) => r.map((c, i) => q(c, dateColIdx.includes(i))).join(",")),
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  a.download = filename.endsWith(".csv") ? filename : filename + ".csv";
  a.click();
}

const DIRECTION_COLOR: Record<string, string> = {
  IN:  "bg-emerald-100 text-emerald-700 border-emerald-200",
  OUT: "bg-rose-100 text-rose-700 border-rose-200",
};

const MOV_LABEL: Record<string, string> = {
  PURCHASE:        "Stock Received (GRN)",
  SALE:            "Stock Sold (POS)",
  CUSTOMER_RETURN: "Customer Return",
  SUPPLIER_RETURN: "Supplier Return",
  TRANSFER_IN:     "Transfer In",
  TRANSFER_OUT:    "Transfer Out",
  ADJUSTMENT_IN:   "Adjustment (+)",
  ADJUSTMENT_OUT:  "Adjustment (-)",
  DAMAGE:          "Damage / Waste",
  EXPIRED:         "Expired Write-off",
};

const LIMIT = 50;

// ─── types ────────────────────────────────────────────────────────────────────
interface ActivityRow {
  id: string; date: string; dateFormatted: string; timeFormatted: string;
  movementType: string; movementLabel: string; direction: "IN" | "OUT";
  product: { id: string; name: string; sku: string; barcodeId: string };
  location: { id: string; name: string; code: string };
  previousQty: number; quantityChanged: number; currentQty: number;
  unitCost: number; totalCostImpact: number;
  referenceType: string; referenceId: string; performedBy: string; notes: string;
}
interface ActivitySummary { totalIn: number; totalOut: number; netChange: number; totalTransactions: number }
interface ValuationSummary { totalUniqueProducts: number; totalPhysicalQuantity: number; totalReservedQuantity: number; totalValueCost: number; totalValueRetail: number }
interface LocationBreakdown { name: string; code: string; distinctProducts: number; quantity: number; reservedQty: number; costValuation: number; retailValuation: number }
interface ProductBreakdown { productId: string; productName: string; sku: string | null; totalQty: number; totalReserved: number; costValuation: number; retailValuation: number; locationCount: number }

// ─── main page ────────────────────────────────────────────────────────────────
export default function InventoryReportsPage() {
  const [tab, setTab] = useState("activity");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState(defaultStart());
  const [end, setEnd] = useState(todayStr());
  const [movType, setMovType] = useState("");
  const [search, setSearch] = useState("");
  const [actPage, setActPage] = useState(1);
  const [valPage, setValPage] = useState(1);
  const [movPage, setMovPage] = useState(1);
  const [trfPage, setTrfPage] = useState(1);
  const [dmgPage, setDmgPage] = useState(1);
  const [adjPage, setAdjPage] = useState(1);
  const [lstPage, setLstPage] = useState(1);

  const { data: locList = [] } = useQuery({
    queryKey: ["rpt-locs"],
    queryFn: async () => (await apiClient.get<ApiResponse<any[]>>("/stocks/locations/get-all")).data.data ?? [],
  });

  // Activity
  const { data: actData, isLoading: actLoad } = useQuery({
    queryKey: ["rpt-activity", actPage, location, start, end, movType, search],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<ActivityRow[]>>("/stocks/reports/activity", {
        params: { page: actPage, limit: LIMIT, locationId: location || undefined, startDate: start || undefined, endDate: end || undefined, movementType: movType || undefined, searchTerm: search || undefined },
      });
      const meta = r.data.meta as any;
      const summary: ActivitySummary | undefined = meta
        ? { totalIn: meta.totalIn ?? 0, totalOut: meta.totalOut ?? 0, netChange: meta.netChange ?? 0, totalTransactions: meta.totalTransactions ?? meta.total ?? 0 }
        : undefined;
      return { data: r.data.data ?? [] as ActivityRow[], meta: r.data.meta ?? { page:1,totalPages:1,total:0,limit:LIMIT }, summary };
    },
  });

  // Valuation
  const { data: valData, isLoading: valLoad } = useQuery({
    queryKey: ["rpt-val", location],
    queryFn: async () => {
      const d = (await apiClient.get<ApiResponse<any>>("/stocks/reports/current", { params: { locationId: location || undefined } })).data.data;
      return { summary: d?.summary as ValuationSummary|null, locationBreakdown: (d?.locationBreakdown ?? []) as LocationBreakdown[], productBreakdown: (d?.productBreakdown ?? []) as ProductBreakdown[] };
    },
    enabled: tab === "valuation",
  });

  // Movements (raw ledger)
  const { data: movData, isLoading: movLoad } = useQuery({
    queryKey: ["rpt-mov", movPage, location, movType, start, end],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>("/stocks/reports/movements", { params: { page: movPage, limit: LIMIT, locationId: location||undefined, movementType: movType||undefined, startDate: start||undefined, endDate: end||undefined } });
      return { data: r.data.data??[] as any[], meta: r.data.meta??{page:1,totalPages:1,total:0,limit:LIMIT} };
    },
    enabled: tab === "movements",
  });

  // Transfers
  const { data: trfData, isLoading: trfLoad } = useQuery({
    queryKey: ["rpt-trf", trfPage, location, start, end],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>("/stocks/reports/transfers", { params: { page: trfPage, limit: LIMIT, sourceLocationId: location||undefined, startDate: start||undefined, endDate: end||undefined } });
      return { data: r.data.data??[] as any[], meta: r.data.meta??{page:1,totalPages:1,total:0,limit:LIMIT} };
    },
    enabled: tab === "transfers",
  });

  // Damages
  const { data: dmgData, isLoading: dmgLoad } = useQuery({
    queryKey: ["rpt-dmg", dmgPage, location, start, end],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>("/stocks/reports/damages", { params: { page: dmgPage, limit: LIMIT, locationId: location||undefined, startDate: start||undefined, endDate: end||undefined } });
      return { data: r.data.data??[] as any[], meta: r.data.meta??{page:1,totalPages:1,total:0,limit:LIMIT} };
    },
    enabled: tab === "damages",
  });

  // Adjustments
  const { data: adjData, isLoading: adjLoad } = useQuery({
    queryKey: ["rpt-adj", adjPage, location, start, end],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>("/stocks/reports/adjustments", { params: { page: adjPage, limit: LIMIT, locationId: location||undefined, startDate: start||undefined, endDate: end||undefined } });
      return { data: r.data.data??[] as any[], meta: r.data.meta??{page:1,totalPages:1,total:0,limit:LIMIT} };
    },
    enabled: tab === "adjustments",
  });

  // Low stock
  const { data: lstData, isLoading: lstLoad } = useQuery({
    queryKey: ["rpt-lst", lstPage, location],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>("/stocks/low-stock-alerts", { params: { page: lstPage, limit: LIMIT, locationId: location||undefined } });
      return { data: r.data.data??[] as any[], meta: r.data.meta??{page:1,totalPages:1,total:0,limit:LIMIT} };
    },
    enabled: tab === "lowstock",
  });

  // ── PDF export ───────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const tabLabel: Record<string,string> = {
      activity:"Detailed Activity Log", valuation:"Stock Valuation Report", movements:"Stock Movement Ledger",
      transfers:"Stock Transfer Report", damages:"Damage & Waste Report", adjustments:"Stock Adjustment Report", lowstock:"Low Stock Alert Report",
    };
    const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    let y = 16;

    // Header block
    doc.setFont("helvetica","bold"); doc.setFontSize(15);
    doc.text("INVENTORY MANAGEMENT REPORT", 14, y); y += 8;
    doc.setFontSize(11);
    doc.text(tabLabel[tab] ?? "Report", 14, y); y += 7;
    doc.setFont("helvetica","normal"); doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y); y += 5;
    if (start || end) { doc.text(`Period: ${start || "—"} to ${end || "—"}`, 14, y); y += 5; }
    if (location) { const ln = locList.find((l:any)=>l.id===location)?.name ?? location; doc.text(`Location: ${ln}`, 14, y); y += 5; }
    doc.setLineWidth(0.3); doc.line(14, y+1, pw-14, y+1); y += 5;

    const tStyle = {
      startY: y,
      styles: { fontSize:7.5, cellPadding:2, textColor:[0,0,0] as [number,number,number], fillColor:[255,255,255] as [number,number,number], lineColor:[0,0,0] as [number,number,number], lineWidth:0.1 },
      headStyles: { fillColor:[255,255,255] as [number,number,number], textColor:[0,0,0] as [number,number,number], fontStyle:"bold" as const, lineWidth:0.25 },
      alternateRowStyles: { fillColor:[248,248,248] as [number,number,number] },
      tableLineColor:[0,0,0] as [number,number,number], tableLineWidth:0.1,
    };

    if (tab === "activity") {
      const rows = actData?.data ?? [];
      // Summary table first
      const sum = actData?.summary;
      if (sum) {
        autoTable(doc, { ...tStyle, head:[["Total Transactions","Stock In (qty)","Stock Out (qty)","Net Change"]], body:[[sum.totalTransactions, sum.totalIn, sum.totalOut, (sum.totalIn - sum.totalOut)]], tableWidth:140 });
        tStyle.startY = (doc as any).lastAutoTable.finalY + 6;
      }
      autoTable(doc, { ...tStyle,
        head:[["Date","Time","Activity","Product","SKU","Location","Prev Qty","Change","New Qty","Cost/Unit","Total Cost","Ref Type","Performed By","Notes"]],
        body: rows.map((r:ActivityRow)=>[r.dateFormatted, r.timeFormatted, r.movementLabel, r.product.name, r.product.sku, r.location.name, r.previousQty, (r.quantityChanged>0?"+":"")+r.quantityChanged, r.currentQty, fmt(r.unitCost), fmt(r.totalCostImpact), r.referenceType, r.performedBy, r.notes]),
        columnStyles:{ 3:{cellWidth:30}, 13:{cellWidth:25} },
      });
    } else if (tab === "valuation") {
      const s = valData?.summary;
      if (s) {
        autoTable(doc, { ...tStyle, head:[["Metric","Value"]], body:[["Total Unique Products",s.totalUniqueProducts],["Total Physical Qty",s.totalPhysicalQuantity],["Total Reserved Qty",s.totalReservedQuantity],["Cost Valuation (BDT)",fmt(s.totalValueCost)],["Retail Valuation (BDT)",fmt(s.totalValueRetail)]], tableWidth:120 });
        tStyle.startY = (doc as any).lastAutoTable.finalY + 8;
      }
      autoTable(doc, { ...tStyle, head:[["Location","Code","Products","Stock Qty","Reserved","Cost (BDT)","Retail (BDT)"]], body:(valData?.locationBreakdown??[]).map((l)=>[l.name,l.code,l.distinctProducts,l.quantity,l.reservedQty,fmt(l.costValuation),fmt(l.retailValuation)]) });
      doc.addPage();
      autoTable(doc, { ...tStyle, startY:16, head:[["Product","SKU","Total Qty","Reserved","Cost (BDT)","Retail (BDT)","Locations"]], body:(valData?.productBreakdown??[]).map((p)=>[p.productName,p.sku??"—",p.totalQty,p.totalReserved,fmt(p.costValuation),fmt(p.retailValuation),p.locationCount]) });
    } else if (tab === "movements") {
      autoTable(doc, { ...tStyle, head:[["Date","Product","SKU","Location","Type","Change","Prev","New","Performed By","Notes"]], body:(movData?.data??[]).map((m:any)=>[new Date(m.createdAt).toLocaleDateString(),m.product?.name,m.product?.sku??"—",m.location?.name,MOV_LABEL[m.movementType]??m.movementType,(m.quantityChanged>0?"+":"")+m.quantityChanged,m.previousQuantity,m.currentQuantity,m.performer?.email??"—",m.notes??"—"]) });
    } else if (tab === "transfers") {
      autoTable(doc, { ...tStyle, head:[["Date","Transfer #","From","To","Status","Created By"]], body:(trfData?.data??[]).map((t:any)=>[new Date(t.createdAt).toLocaleDateString(),t.transferNumber??t.id?.slice(-8),t.sourceLocation?.name,t.destinationLocation?.name,t.status,t.creator?.email]) });
    } else if (tab === "damages") {
      autoTable(doc, { ...tStyle, head:[["Date","Ref #","Location","Status","Total Qty","Loss (BDT)","Created By"]], body:(dmgData?.data??[]).map((d:any)=>[new Date(d.createdAt).toLocaleDateString(),d.damageNumber??d.id?.slice(-8),d.location?.name,d.status,(d.items??[]).reduce((s:number,i:any)=>s+(i.quantity||0),0),fmt(d.totalLossValuation),d.creator?.email]) });
    } else if (tab === "adjustments") {
      autoTable(doc, { ...tStyle, head:[["Date","Ref #","Location","Status","Reason","Added","Removed","Net","Created By"]], body:(adjData?.data??[]).map((a:any)=>[new Date(a.createdAt).toLocaleDateString(),a.adjustmentNumber,a.locationName,a.status,a.reason??"—",a.totalAdded??0,a.totalRemoved??0,(a.totalAdded??0)-(a.totalRemoved??0),a.createdBy]) });
    } else if (tab === "lowstock") {
      autoTable(doc, { ...tStyle, head:[["Product","SKU","Location","Current Qty","Min Threshold","Reorder Qty","Deficit"]], body:(lstData?.data??[]).map((l:any)=>[l.productName,l.sku??"—",l.locationName,l.currentQuantity,l.minimumQuantity,l.reorderQuantity,Math.max(0,l.minimumQuantity-l.currentQuantity)]) });
    }

    const total = (doc as any).internal.getNumberOfPages();
    for (let i=1;i<=total;i++) {
      doc.setPage(i); doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(130);
      doc.text(`Page ${i} of ${total}`, pw-14, ph-6, {align:"right"});
      doc.text("Inventory Management System", 14, ph-6);
      doc.setTextColor(0);
    }
    doc.save(`inventory-${tab}-${todayStr()}.pdf`);
  };

  // ── Excel export ─────────────────────────────────────────────────────────────
  const exportExcel = () => {
    const fn = `inventory-${tab}-${todayStr()}`;
    const fd = (d: string) => new Date(d).toISOString().slice(0, 10);
    if (tab === "activity") {
      downloadCSV(fn,
        ["Date","Time","Activity","Direction","Product","SKU","Barcode","Location","Loc Code","Prev Qty","Change","New Qty","Cost/Unit (BDT)","Total Cost (BDT)","Ref Type","Ref ID","Performed By","Notes"],
        (actData?.data ?? []).map((r: ActivityRow) => [r.dateFormatted, r.timeFormatted, r.movementLabel, r.direction, r.product.name, r.product.sku, r.product.barcodeId, r.location.name, r.location.code, r.previousQty, r.quantityChanged, r.currentQty, r.unitCost, r.totalCostImpact, r.referenceType, r.referenceId, r.performedBy, r.notes]),
        [0]);
    } else if (tab === "valuation") {
      downloadCSV(fn,
        ["Location","Code","Distinct Products","Stock Qty","Reserved Qty","Cost Valuation (BDT)","Retail Valuation (BDT)"],
        (valData?.locationBreakdown ?? []).map((l) => [l.name, l.code, l.distinctProducts, l.quantity, l.reservedQty, l.costValuation, l.retailValuation]));
    } else if (tab === "movements") {
      downloadCSV(fn,
        ["Date","Product","SKU","Location","Movement Type","Prev Qty","Change","New Qty","Ref Type","Ref ID","Performed By","Notes"],
        (movData?.data ?? []).map((m: any) => [fd(m.createdAt), m.product?.name, m.product?.sku ?? "—", m.location?.name, MOV_LABEL[m.movementType] ?? m.movementType, m.previousQuantity, m.quantityChanged, m.currentQuantity, m.referenceType, m.referenceId, m.performer?.email ?? "—", m.notes ?? "—"]),
        [0]);
    } else if (tab === "transfers") {
      downloadCSV(fn,
        ["Date","Transfer #","From Location","To Location","Status","Transfer Date","Received Date","Created By"],
        (trfData?.data ?? []).map((t: any) => [fd(t.createdAt), t.transferNumber ?? t.id, t.sourceLocation?.name, t.destinationLocation?.name, t.status, t.transferDate ? fd(t.transferDate) : "—", t.receivedDate ? fd(t.receivedDate) : "—", t.creator?.email]),
        [0, 5, 6]);
    } else if (tab === "damages") {
      downloadCSV(fn,
        ["Date","Ref #","Location","Status","Total Qty","Total Loss (BDT)","Created By"],
        (dmgData?.data ?? []).map((d: any) => [fd(d.createdAt), d.damageNumber ?? d.id, d.location?.name, d.status, (d.items ?? []).reduce((s: number, i: any) => s + (i.quantity || 0), 0), d.totalLossValuation ?? 0, d.creator?.email]),
        [0]);
    } else if (tab === "adjustments") {
      downloadCSV(fn,
        ["Date","Ref #","Location","Status","Reason","Added Qty","Removed Qty","Net Change","Created By"],
        (adjData?.data ?? []).map((a: any) => [fd(a.createdAt), a.adjustmentNumber, a.locationName, a.status, a.reason ?? "—", a.totalAdded ?? 0, a.totalRemoved ?? 0, (a.totalAdded ?? 0) - (a.totalRemoved ?? 0), a.createdBy]),
        [0]);
    } else if (tab === "lowstock") {
      downloadCSV(fn,
        ["Product","SKU","Location","Current Qty","Min Threshold","Reorder Qty","Deficit"],
        (lstData?.data ?? []).map((l: any) => [l.productName, l.sku ?? "—", l.locationName, l.currentQuantity, l.minimumQuantity, l.reorderQuantity, Math.max(0, l.minimumQuantity - l.currentQuantity)]));
    }
  };

  // ── shared sub-components ─────────────────────────────────────────────────────
  const Spinner = () => <div className="p-16 text-center text-slate-400 text-sm">Loading…</div>;
  const Empty = ({ text }: { text: string }) => <div className="p-16 text-center text-slate-400 text-sm">{text}</div>;
  const Pager = ({ meta, set }: { meta: any; set: (p: number) => void }) =>
    meta?.totalPages > 1 ? (
      <div className="p-4 border-t flex items-center justify-between text-xs text-slate-500">
        <span>Page {meta.page} of {meta.totalPages} — {meta.total} records</span>
        <PaginationControl currentPage={meta.page} totalPages={meta.totalPages} onPageChange={set} />
      </div>
    ) : null;

  // ── filter bar helper ─────────────────────────────────────────────────────────
  const Sel = ({ label, value, onChange, opts }: { label: string; value: string; onChange: (v: string) => void; opts: { value: string; label: string }[] }) => (
    <div>
      <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm h-9 rounded-lg px-3 outline-none focus:ring-1 focus:ring-slate-300">
        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
  const DateF = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div>
      <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
      <input type="date" value={value} onChange={e => onChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm h-9 rounded-lg px-3 outline-none focus:ring-1 focus:ring-slate-300" />
    </div>
  );

  const locOpts = [{ value: "", label: "All Locations" }, ...locList.map((l: any) => ({ value: l.id, label: l.name }))];
  const movTypeOpts = [
    { value: "", label: "All Types" },
    { value: "PURCHASE", label: "Stock Received (GRN)" },
    { value: "SALE", label: "Stock Sold (POS)" },
    { value: "CUSTOMER_RETURN", label: "Customer Return" },
    { value: "SUPPLIER_RETURN", label: "Supplier Return" },
    { value: "TRANSFER_IN", label: "Transfer In" },
    { value: "TRANSFER_OUT", label: "Transfer Out" },
    { value: "ADJUSTMENT_IN", label: "Adjustment (+)" },
    { value: "ADJUSTMENT_OUT", label: "Adjustment (-)" },
    { value: "DAMAGE", label: "Damage / Waste" },
    { value: "EXPIRED", label: "Expired Write-off" },
  ];

  // ── JSX ───────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 p-1">
      {/* Page header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white px-6 py-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Inventory Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Detailed activity log, valuation, movements, transfers, damages, adjustments and low-stock.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel} className="text-xs gap-1.5 rounded-xl border-slate-200">
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF} className="text-xs gap-1.5 rounded-xl border-slate-200">
            <LuPrinter className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 border-slate-100 shadow-sm">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          <Sel label="Location" value={location} onChange={v => { setLocation(v); setActPage(1); setMovPage(1); }} opts={locOpts} />
          <DateF label="From Date" value={start} onChange={v => { setStart(v); setActPage(1); setMovPage(1); }} />
          <DateF label="To Date" value={end} onChange={v => { setEnd(v); setActPage(1); setMovPage(1); }} />
          {(tab === "activity" || tab === "movements") && (
            <Sel label="Event Type" value={movType} onChange={v => { setMovType(v); setActPage(1); setMovPage(1); }} opts={movTypeOpts} />
          )}
          {tab === "activity" && (
            <div className="col-span-2">
              <p className="text-xs font-semibold text-slate-500 mb-1">Search Product / Notes</p>
              <input value={search} onChange={e => { setSearch(e.target.value); setActPage(1); }} placeholder="Product name, SKU, notes…" className="w-full bg-slate-50 border border-slate-200 text-sm h-9 rounded-lg px-3 outline-none focus:ring-1 focus:ring-slate-300" />
            </div>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v)}>
        <TabsList className="flex-wrap h-auto gap-1 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="activity" className="rounded-lg text-xs">Activity Log</TabsTrigger>
          <TabsTrigger value="valuation" className="rounded-lg text-xs">Valuation</TabsTrigger>
          <TabsTrigger value="movements" className="rounded-lg text-xs">Ledger</TabsTrigger>
          <TabsTrigger value="transfers" className="rounded-lg text-xs">Transfers</TabsTrigger>
          <TabsTrigger value="damages" className="rounded-lg text-xs">Damages</TabsTrigger>
          <TabsTrigger value="adjustments" className="rounded-lg text-xs">Adjustments</TabsTrigger>
          <TabsTrigger value="lowstock" className="rounded-lg text-xs">Low Stock</TabsTrigger>
        </TabsList>

        {/* ── Activity Log ─────────────────────────────────────────────────────── */}
        <TabsContent value="activity">
          <Card className="border-slate-100 shadow-sm overflow-hidden">
            {actData?.summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px border-b border-slate-100 bg-slate-100">
                {[
                  { label: "Total Transactions", val: actData.summary.totalTransactions, color: "text-slate-800" },
                  { label: "Total Stock IN", val: `+${actData.summary.totalIn} qty`, color: "text-emerald-700" },
                  { label: "Total Stock OUT", val: `-${actData.summary.totalOut} qty`, color: "text-rose-700" },
                  { label: "Net Change", val: (actData.summary.netChange >= 0 ? "+" : "") + actData.summary.netChange + " qty", color: actData.summary.netChange >= 0 ? "text-emerald-700" : "text-rose-700" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-white px-5 py-4">
                    <p className="text-xs text-slate-500 mb-1">{label}</p>
                    <p className={`text-lg font-bold ${color}`}>{val}</p>
                  </div>
                ))}
              </div>
            )}
            {actLoad ? <Spinner /> : !actData?.data?.length ? <Empty text="No activity found for the selected filters." /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {["Date","Time","Activity","Direction","Product","SKU","Location","Prev Qty","Change","New Qty","Cost/Unit","Total Cost","Ref Type","Performed By","Notes"].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap border-b border-slate-200">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {actData.data.map((r: ActivityRow, i: number) => (
                      <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                        <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-700">{r.dateFormatted}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-500">{r.timeFormatted}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="font-medium text-slate-800">{r.movementLabel}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${DIRECTION_COLOR[r.direction]}`}>
                            {r.direction === "IN" ? "▲ IN" : "▼ OUT"}
                          </span>
                        </td>
                        <td className="px-3 py-2 max-w-[160px] truncate font-medium text-slate-800" title={r.product.name}>{r.product.name}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-500">{r.product.sku}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-600">{r.location.name}</td>
                        <td className="px-3 py-2 text-center text-slate-500">{r.previousQty}</td>
                        <td className={`px-3 py-2 text-center font-bold ${r.quantityChanged > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                          {r.quantityChanged > 0 ? `+${r.quantityChanged}` : r.quantityChanged}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold text-slate-800">{r.currentQty}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{fmt(r.unitCost)}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${r.direction === "OUT" ? "text-rose-700" : "text-emerald-700"}`}>{fmt(r.totalCostImpact)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-500">{r.referenceType}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-500">{r.performedBy}</td>
                        <td className="px-3 py-2 max-w-[180px] truncate text-slate-400" title={r.notes}>{r.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pager meta={actData?.meta} set={setActPage} />
          </Card>
        </TabsContent>

        {/* ── Valuation ─────────────────────────────────────────────────────────── */}
        <TabsContent value="valuation">
          <div className="space-y-4">
            {valLoad ? <Card className="border-slate-100"><Spinner /></Card> : <>
              {valData?.summary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-slate-100 rounded-xl overflow-hidden border border-slate-100">
                  {[
                    { l: "Unique Products", v: valData.summary.totalUniqueProducts },
                    { l: "Physical Qty", v: valData.summary.totalPhysicalQuantity },
                    { l: "Reserved Qty", v: valData.summary.totalReservedQuantity },
                    { l: "Cost Value (BDT)", v: fmt(valData.summary.totalValueCost) },
                    { l: "Retail Value (BDT)", v: fmt(valData.summary.totalValueRetail) },
                  ].map(({ l, v }) => (
                    <div key={l} className="bg-white px-5 py-4">
                      <p className="text-xs text-slate-500">{l}</p>
                      <p className="text-lg font-bold text-slate-800 mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
              )}
              <Card className="border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wide">Location Breakdown</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-600 min-w-[140px]">Location</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap">Code</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-slate-600 whitespace-nowrap">Distinct Products</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-slate-600 whitespace-nowrap">Stock Qty</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-slate-600 whitespace-nowrap">Reserved Qty</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-slate-600 whitespace-nowrap">Cost Value (BDT)</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-slate-600 whitespace-nowrap">Retail Value (BDT)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(valData?.locationBreakdown ?? []).map((l, i) => (
                        <tr key={l.code} className={i%2===0?"bg-white":"bg-slate-50/60"}>
                          <td className="px-4 py-2 font-medium text-slate-800 min-w-[140px] wrap-break-word">{l.name}</td>
                          <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{l.code}</td>
                          <td className="px-4 py-2 text-right">{l.distinctProducts}</td>
                          <td className="px-4 py-2 text-right font-semibold text-slate-800">{l.quantity}</td>
                          <td className="px-4 py-2 text-right text-slate-500">{l.reservedQty}</td>
                          <td className="px-4 py-2 text-right font-medium">{fmt(l.costValuation)}</td>
                          <td className="px-4 py-2 text-right font-medium text-emerald-700">{fmt(l.retailValuation)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
              <Card className="border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wide">Product Breakdown</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-600 min-w-[160px]">Product</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap">SKU</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-slate-600 whitespace-nowrap">Total Qty</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-slate-600 whitespace-nowrap">Reserved</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-slate-600 whitespace-nowrap">Cost Value (BDT)</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-slate-600 whitespace-nowrap">Retail Value (BDT)</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-slate-600 whitespace-nowrap">Locations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(valData?.productBreakdown ?? []).map((p, i) => (
                        <tr key={p.productId} className={i%2===0?"bg-white":"bg-slate-50/60"}>
                          <td className="px-4 py-2 font-medium text-slate-800 min-w-[160px] wrap-break-word">{p.productName}</td>
                          <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{p.sku ?? "—"}</td>
                          <td className="px-4 py-2 text-right font-semibold">{p.totalQty}</td>
                          <td className="px-4 py-2 text-right text-slate-500">{p.totalReserved}</td>
                          <td className="px-4 py-2 text-right">{fmt(p.costValuation)}</td>
                          <td className="px-4 py-2 text-right font-medium text-emerald-700">{fmt(p.retailValuation)}</td>
                          <td className="px-4 py-2 text-right text-slate-500">{p.locationCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>}
          </div>
        </TabsContent>

        {/* ── Raw Ledger ────────────────────────────────────────────────────────── */}
        <TabsContent value="movements">
          <Card className="border-slate-100 shadow-sm overflow-hidden">
            {movLoad ? <Spinner /> : !movData?.data?.length ? <Empty text="No movements found." /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-slate-50 border-b">
                    <tr>{["Date & Time","Product","SKU","Location","Movement Type","Prev Qty","Change","New Qty","Ref Type","Performed By","Notes"].map(h=><th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {(movData.data ?? []).map((m: any, i: number) => (
                      <tr key={m.id} className={i%2===0?"bg-white":"bg-slate-50/60"}>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-600">{new Date(m.createdAt).toLocaleString()}</td>
                        <td className="px-3 py-2 font-medium text-slate-800 max-w-[150px] truncate">{m.product?.name}</td>
                        <td className="px-3 py-2 text-slate-500">{m.product?.sku ?? "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-600">{m.location?.name}</td>
                        <td className="px-3 py-2 whitespace-nowrap"><span className="font-medium">{MOV_LABEL[m.movementType] ?? m.movementType}</span></td>
                        <td className="px-3 py-2 text-center text-slate-500">{m.previousQuantity}</td>
                        <td className={`px-3 py-2 text-center font-bold ${m.quantityChanged > 0 ? "text-emerald-700" : "text-rose-700"}`}>{m.quantityChanged > 0 ? `+${m.quantityChanged}` : m.quantityChanged}</td>
                        <td className="px-3 py-2 text-center font-semibold text-slate-800">{m.currentQuantity}</td>
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{m.referenceType}</td>
                        <td className="px-3 py-2 text-slate-500">{m.performer?.email ?? "—"}</td>
                        <td className="px-3 py-2 text-slate-400 max-w-[140px] truncate">{m.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pager meta={movData?.meta} set={setMovPage} />
          </Card>
        </TabsContent>

        {/* ── Transfers ─────────────────────────────────────────────────────────── */}
        <TabsContent value="transfers">
          <Card className="border-slate-100 shadow-sm overflow-hidden">
            {trfLoad ? <Spinner /> : !trfData?.data?.length ? <Empty text="No transfers found." /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-slate-50 border-b"><tr>{["Date","Transfer #","From Location","To Location","Status","Transfer Date","Received Date","Created By"].map(h=><th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody>
                    {(trfData.data ?? []).map((t: any, i: number) => (
                      <tr key={t.id} className={i%2===0?"bg-white":"bg-slate-50/60"}>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-600">{new Date(t.createdAt).toLocaleDateString()}</td>
                        <td className="px-3 py-2 font-mono text-slate-700">{t.transferNumber ?? t.id?.slice(-8)}</td>
                        <td className="px-3 py-2 text-slate-700">{t.sourceLocation?.name}</td>
                        <td className="px-3 py-2 text-slate-700">{t.destinationLocation?.name}</td>
                        <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">{t.status}</span></td>
                        <td className="px-3 py-2 text-slate-500">{t.transferDate ? new Date(t.transferDate).toLocaleDateString() : "—"}</td>
                        <td className="px-3 py-2 text-slate-500">{t.receivedDate ? new Date(t.receivedDate).toLocaleDateString() : "—"}</td>
                        <td className="px-3 py-2 text-slate-500">{t.creator?.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pager meta={trfData?.meta} set={setTrfPage} />
          </Card>
        </TabsContent>

        {/* ── Damages ───────────────────────────────────────────────────────────── */}
        <TabsContent value="damages">
          <Card className="border-slate-100 shadow-sm overflow-hidden">
            {dmgLoad ? <Spinner /> : !dmgData?.data?.length ? <Empty text="No damage records found." /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap">Date</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap">Ref #</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-600 min-w-[120px]">Location</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap">Status</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-600 min-w-[160px]">Products</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-slate-600 whitespace-nowrap">Total Qty</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-slate-600 whitespace-nowrap">Total Loss (BDT)</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap">Created By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dmgData.data ?? []).map((d: any, i: number) => {
                      const totalQty = (d.items ?? []).reduce((s: number, item: any) => s + (item.quantity || 0), 0);
                      return (
                        <tr key={d.id} className={i%2===0?"bg-white":"bg-slate-50/60"}>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-600">{new Date(d.createdAt).toLocaleDateString()}</td>
                          <td className="px-3 py-2 font-mono text-slate-700">{d.damageNumber ?? d.id?.slice(-8)}</td>
                          <td className="px-3 py-2 text-slate-700 min-w-[120px]">{d.location?.name}</td>
                          <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700">{d.status}</span></td>
                          <td className="px-3 py-2 text-slate-500 min-w-[160px]">{(d.items ?? []).map((item: any) => item.product?.name).join(", ") || "—"}</td>
                          <td className="px-3 py-2 text-right font-semibold text-rose-700">{totalQty}</td>
                          <td className="px-3 py-2 text-right font-semibold text-rose-700">{fmt(d.totalLossValuation)}</td>
                          <td className="px-3 py-2 text-slate-500">{d.creator?.email}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Pager meta={dmgData?.meta} set={setDmgPage} />
          </Card>
        </TabsContent>

        {/* ── Adjustments ────────────────────────────────────────────────────────── */}
        <TabsContent value="adjustments">
          <Card className="border-slate-100 shadow-sm overflow-hidden">
            {adjLoad ? <Spinner /> : !adjData?.data?.length ? <Empty text="No adjustment records found." /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-slate-50 border-b"><tr>{["Date","Ref #","Location","Status","Reason","Added","Removed","Net Change","Items","Created By"].map(h=><th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody>
                    {(adjData.data ?? []).map((a: any, i: number) => {
                      const net = (a.totalAdded ?? 0) - (a.totalRemoved ?? 0);
                      return (
                        <tr key={a.id} className={i%2===0?"bg-white":"bg-slate-50/60"}>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-600">{new Date(a.createdAt).toLocaleDateString()}</td>
                          <td className="px-3 py-2 font-mono text-slate-700">{a.adjustmentNumber}</td>
                          <td className="px-3 py-2 text-slate-700">{a.locationName}</td>
                          <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">{a.status}</span></td>
                          <td className="px-3 py-2 text-slate-500">{a.reason ?? "—"}</td>
                          <td className="px-3 py-2 text-center font-semibold text-emerald-700">{a.totalAdded ?? 0}</td>
                          <td className="px-3 py-2 text-center font-semibold text-rose-700">{a.totalRemoved ?? 0}</td>
                          <td className={`px-3 py-2 text-center font-bold ${net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{net >= 0 ? `+${net}` : net}</td>
                          <td className="px-3 py-2 text-center text-slate-500">{a.totalItemLines}</td>
                          <td className="px-3 py-2 text-slate-500">{a.createdBy}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Pager meta={adjData?.meta} set={setAdjPage} />
          </Card>
        </TabsContent>

        {/* ── Low Stock ─────────────────────────────────────────────────────────── */}
        <TabsContent value="lowstock">
          <Card className="border-slate-100 shadow-sm overflow-hidden">
            {lstLoad ? <Spinner /> : !lstData?.data?.length ? <Empty text="No low-stock products found." /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-slate-50 border-b"><tr>{["Product","SKU","Location","Current Qty","Min Threshold","Reorder Qty","Deficit"].map(h=><th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody>
                    {(lstData.data ?? []).map((l: any, i: number) => {
                      const deficit = Math.max(0, l.minimumQuantity - l.currentQuantity);
                      return (
                        <tr key={`${l.productId}-${l.locationId}`} className={i%2===0?"bg-white":"bg-slate-50/60"}>
                          <td className="px-3 py-2 font-medium text-slate-800">{l.productName}</td>
                          <td className="px-3 py-2 text-slate-500">{l.sku ?? "—"}</td>
                          <td className="px-3 py-2 text-slate-600">{l.locationName}</td>
                          <td className="px-3 py-2 text-center font-bold text-rose-700">{l.currentQuantity}</td>
                          <td className="px-3 py-2 text-center text-slate-500">{l.minimumQuantity}</td>
                          <td className="px-3 py-2 text-center text-blue-700 font-semibold">{l.reorderQuantity}</td>
                          <td className="px-3 py-2 text-center font-bold text-amber-700">{deficit}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Pager meta={lstData?.meta} set={setLstPage} />
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
