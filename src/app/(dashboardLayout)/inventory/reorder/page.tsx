"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { apiClient } from "@/lib/api";
import { ApiResponse } from "@/types/auth";
import {
  LuRefreshCw,
  LuPlus,
  LuFileText,
  LuPackageSearch,
  LuTriangleAlert,
  LuSlidersHorizontal,
} from "react-icons/lu";
import { toast } from "react-hot-toast";
import Loader from "@/components/Common/Loader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PaginationControl } from "@/components/Common/Pagination";

// ─── Validation schemas ────────────────────────────────────────────────────────
const poFormSchema = zod.object({
  supplierId: zod.coerce.number().min(1, "Supplier is required"),
  locationId: zod.string().min(1, "Location is required"),
  orderDate: zod.string().min(1, "Order date is required"),
  expectedDate: zod.string().optional(),
  notes: zod.string().optional(),
  items: zod
    .array(
      zod.object({
        productId: zod.string().min(1),
        productName: zod.string().optional(),
        sku: zod.string().nullable().optional(),
        quantity: zod.number().min(1),
        unitPrice: zod.number().min(0),
        taxPercent: zod.number().default(0),
        discountPercent: zod.number().default(0),
      }),
    )
    .min(1, "Select at least one item"),
});

const lowStockConfigSchema = zod.object({
  productId: zod.string().min(1, "Product is required"),
  locationId: zod.string().nullable().optional(),
  minimumQuantity: zod.coerce.number().min(0, "Must be positive"),
  reorderQuantity: zod.coerce.number().min(0, "Must be positive"),
});

type POFormValues = zod.infer<typeof poFormSchema>;
type LowStockConfigFormValues = zod.infer<typeof lowStockConfigSchema>;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface LowStockAlert {
  productId: string;
  productName: string;
  sku: string | null;
  locationId: string;
  locationName: string;
  currentQuantity: number;
  reorderThreshold: number;
  suggestedReorderQuantity: number;
  minimumQuantity: number;
  reorderQuantity: number;
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function LowStockAlertPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;
  const [selectedLocation, setSelectedLocation] = useState("");

  // PO modal
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [poOpen, setPoOpen] = useState(false);

  // Threshold config modal
  const [configOpen, setConfigOpen] = useState(false);
  const [configAlert, setConfigAlert] = useState<LowStockAlert | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: alertsRes, isLoading } = useQuery({
    queryKey: ["low-stock-alert", page, selectedLocation],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>("/stocks/low-stock-alerts", {
        params: { page, limit, locationId: selectedLocation || undefined },
      });
      const p = r.data;
      return {
        data: (Array.isArray(p.data) ? p.data : ((p.data as any)?.data ?? [])) as LowStockAlert[],
        meta: (p.meta || (p.data as any)?.meta || { page: 1, totalPages: 1, total: 0, limit }) as {
          page: number; totalPages: number; total: number; limit: number;
        },
      };
    },
  });

  const { data: locationsRes } = useQuery({
    queryKey: ["low-stock-alert", "locations"],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any[]>>("/stocks/locations/get-all");
      return r.data.data as any[];
    },
  });

  const { data: suppliersRes } = useQuery({
    queryKey: ["low-stock-alert", "suppliers"],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any[]>>("/suppliers/get-all");
      return r.data.data as any[];
    },
  });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createPOMutation = useMutation({
    mutationFn: async (payload: POFormValues) => {
      const body = {
        supplierId: payload.supplierId,
        locationId: payload.locationId,
        orderDate: payload.orderDate,
        expectedDate: payload.expectedDate || undefined,
        notes: payload.notes || undefined,
        items: payload.items.map(({ productId, quantity, unitPrice, taxPercent, discountPercent }) => ({
          productId, quantity, unitPrice, taxPercent, discountPercent,
        })),
      };
      const r = await apiClient.post<ApiResponse<any>>("/purchase-orders/create", body);
      return r.data;
    },
    onSuccess: () => {
      toast.success("Purchase Order generated successfully");
      setPoOpen(false);
      setSelectedItems({});
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-alert"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to create PO");
    },
  });

  const updateThresholdMutation = useMutation({
    mutationFn: async (payload: LowStockConfigFormValues) => {
      const r = await apiClient.post<ApiResponse<any>>("/stocks/low-stock-configs", payload);
      return r.data;
    },
    onSuccess: () => {
      toast.success("Threshold configured successfully");
      setConfigOpen(false);
      setConfigAlert(null);
      queryClient.invalidateQueries({ queryKey: ["low-stock-alert"] });
      queryClient.invalidateQueries({ queryKey: ["stocks"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to configure threshold");
    },
  });

  // ── PO form ──────────────────────────────────────────────────────────────────
  const poForm = useForm<POFormValues>({
    resolver: zodResolver(poFormSchema) as any,
    defaultValues: {
      supplierId: 0, locationId: "", orderDate: new Date().toISOString().substring(0, 10),
      expectedDate: "", notes: "Generated from Low Stock Alert.", items: [],
    },
  });
  const { fields } = useFieldArray({ control: poForm.control, name: "items" });
  const watchedItems = poForm.watch("items");

  // ── Config form ──────────────────────────────────────────────────────────────
  const configForm = useForm<LowStockConfigFormValues>({
    resolver: zodResolver(lowStockConfigSchema) as any,
    defaultValues: { productId: "", locationId: null, minimumQuantity: 10, reorderQuantity: 50 },
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const itemsList = alertsRes?.data ?? [];
  const meta = alertsRes?.meta ?? { page: 1, totalPages: 1, total: 0, limit };
  const selectedCount = Object.values(selectedItems).filter(Boolean).length;

  const toggleSelect = (key: string) =>
    setSelectedItems((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleOpenBulkPO = () => {
    const chosen = itemsList.filter((item) => !!selectedItems[`${item.productId}-${item.locationId}`]);
    if (chosen.length === 0) { toast.error("Select at least one item"); return; }
    poForm.reset({
      supplierId: 0,
      locationId: chosen[0].locationId,
      orderDate: new Date().toISOString().substring(0, 10),
      expectedDate: "",
      notes: "Generated from Low Stock Alert.",
      items: chosen.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.suggestedReorderQuantity || item.reorderQuantity || 50,
        unitPrice: 0, taxPercent: 0, discountPercent: 0,
      })),
    });
    setPoOpen(true);
  };

  const handleOpenConfig = (item: LowStockAlert) => {
    setConfigAlert(item);
    configForm.reset({
      productId: item.productId,
      locationId: item.locationId,
      minimumQuantity: item.minimumQuantity ?? item.reorderThreshold,
      reorderQuantity: item.reorderQuantity ?? item.suggestedReorderQuantity,
    });
    setConfigOpen(true);
  };

  const calculatedTotal = React.useMemo(() => {
    return (watchedItems ?? []).reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  }, [watchedItems]);

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <LuTriangleAlert className="h-6 w-6 text-red-500" />
            Low Stock Alert
          </h1>
          <p className="text-xs text-slate-500">
            Products running below safe stock levels. Select items and generate a Purchase Order, or adjust thresholds.
          </p>
        </div>
        <Button
          onClick={handleOpenBulkPO}
          disabled={selectedCount === 0}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 disabled:opacity-50"
        >
          <LuPlus className="h-4 w-4" />
          Generate PO for Selected ({selectedCount})
        </Button>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────────── */}
      <Card className="p-4 border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <select
            value={selectedLocation}
            onChange={(e) => { setSelectedLocation(e.target.value); setPage(1); }}
            className="w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3"
          >
            <option value="">All Locations</option>
            {locationsRes?.map((loc: any) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* ── Table ─────────────────────────────────────────────────────────────── */}
      <Card className="border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center"><Loader /></div>
        ) : itemsList.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <LuTriangleAlert className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium">All stock levels are safe.</p>
            <p className="text-xs text-slate-400 mt-1">No active low stock alerts.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase">
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      className="accent-indigo-600 h-4 w-4 cursor-pointer"
                      checked={itemsList.length > 0 && itemsList.every((item) => selectedItems[`${item.productId}-${item.locationId}`])}
                      onChange={(e) => {
                        const next: Record<string, boolean> = {};
                        itemsList.forEach((item) => { next[`${item.productId}-${item.locationId}`] = e.target.checked; });
                        setSelectedItems(next);
                      }}
                    />
                  </th>
                  <th className="p-4">Product</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4">Location</th>
                  <th className="p-4 text-center">Current Qty</th>
                  <th className="p-4 text-center">Safety Minimum</th>
                  <th className="p-4 text-center">Suggested Reorder</th>
                  <th className="p-4 text-center">Deficit</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {itemsList.map((item) => {
                  const key = `${item.productId}-${item.locationId}`;
                  const minQty = item.minimumQuantity ?? item.reorderThreshold;
                  const deficit = minQty - item.currentQuantity;
                  const isSelected = !!selectedItems[key];
                  return (
                    <tr
                      key={key}
                      onClick={() => toggleSelect(key)}
                      className={`cursor-pointer transition-colors ${isSelected ? "bg-indigo-50/60" : "hover:bg-slate-50"}`}
                    >
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="accent-indigo-600 h-4 w-4 cursor-pointer"
                          checked={isSelected}
                          onChange={() => toggleSelect(key)}
                        />
                      </td>
                      <td className="p-4 font-semibold text-slate-900">{item.productName}</td>
                      <td className="p-4 font-mono text-xs text-slate-500">
                        {item.sku ?? <span className="text-slate-300 italic">—</span>}
                      </td>
                      <td className="p-4 text-slate-600">{item.locationName}</td>
                      <td className="p-4 text-center font-bold text-red-600 bg-red-50/40">
                        {item.currentQuantity}
                      </td>
                      <td className="p-4 text-center font-medium text-slate-600">{minQty}</td>
                      <td className="p-4 text-center">
                        <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                          {item.suggestedReorderQuantity ?? item.reorderQuantity}
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold">
                        {deficit > 0
                          ? <span className="text-red-600">-{deficit}</span>
                          : <span className="text-amber-500">0</span>}
                      </td>
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          onClick={() => handleOpenConfig(item)}
                          className="text-xs text-indigo-600 hover:bg-indigo-50 font-medium px-3 py-1.5 rounded-xl border border-slate-200"
                        >
                          <LuSlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                          Config
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {meta.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Page {meta.page} of {meta.totalPages} — {meta.total} entries
                </p>
                <PaginationControl currentPage={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Generate PO Modal ──────────────────────────────────────────────────── */}
      <Dialog open={poOpen} onOpenChange={setPoOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <LuFileText className="h-5 w-5 text-indigo-600" />
              Generate Purchase Order
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={poForm.handleSubmit((v) => createPOMutation.mutate(v))} className="space-y-5 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Supplier *</label>
                <select
                  {...poForm.register("supplierId")}
                  className="w-full bg-slate-50 border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3"
                >
                  <option value={0}>Select Supplier</option>
                  {suppliersRes?.map((sup: any) => (
                    <option key={sup.id} value={sup.id}>{sup.name || sup.companyName}</option>
                  ))}
                </select>
                {poForm.formState.errors.supplierId && (
                  <p className="text-red-500 text-[10px] mt-0.5">{poForm.formState.errors.supplierId.message}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Target Location *</label>
                <select
                  {...poForm.register("locationId")}
                  className="w-full bg-slate-50 border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3"
                >
                  <option value="">Select Location</option>
                  {locationsRes?.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
                {poForm.formState.errors.locationId && (
                  <p className="text-red-500 text-[10px] mt-0.5">{poForm.formState.errors.locationId.message}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Order Date *</label>
                <input type="date" {...poForm.register("orderDate")} className="w-full bg-slate-50 border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Expected Delivery</label>
                <input type="date" {...poForm.register("expectedDate")} className="w-full bg-slate-50 border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Notes</label>
                <input type="text" {...poForm.register("notes")} className="w-full bg-slate-50 border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3" />
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-800">
                Order Items <span className="ml-1 text-xs font-normal text-slate-400">({fields.length} product{fields.length !== 1 ? "s" : ""})</span>
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3 w-28 text-center">Qty</th>
                      <th className="p-3 w-32 text-center">Unit Price</th>
                      <th className="p-3 w-24 text-center">Tax %</th>
                      <th className="p-3 w-28 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fields.map((field, index) => {
                      const qty = watchedItems?.[index]?.quantity || 0;
                      const price = watchedItems?.[index]?.unitPrice || 0;
                      const tax = watchedItems?.[index]?.taxPercent || 0;
                      const lineTotal = qty * price * (1 + tax / 100);
                      return (
                        <tr key={field.id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <p className="font-semibold text-slate-900">{watchedItems?.[index]?.productName || field.productName}</p>
                            {(watchedItems?.[index]?.sku ?? field.sku) && (
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">SKU: {watchedItems?.[index]?.sku ?? field.sku}</p>
                            )}
                            <input type="hidden" {...poForm.register(`items.${index}.productId`)} />
                            <input type="hidden" {...poForm.register(`items.${index}.productName`)} />
                            <input type="hidden" {...poForm.register(`items.${index}.sku`)} />
                          </td>
                          <td className="p-3">
                            <input type="number" min={1} {...poForm.register(`items.${index}.quantity`, { valueAsNumber: true })} className="w-full border border-slate-200 rounded-lg p-1.5 text-center font-bold bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                          </td>
                          <td className="p-3">
                            <input type="number" min={0} step="0.01" {...poForm.register(`items.${index}.unitPrice`, { valueAsNumber: true })} className="w-full border border-slate-200 rounded-lg p-1.5 text-right bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                          </td>
                          <td className="p-3">
                            <input type="number" min={0} max={100} step="0.1" {...poForm.register(`items.${index}.taxPercent`, { valueAsNumber: true })} className="w-full border border-slate-200 rounded-lg p-1.5 text-center bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                          </td>
                          <td className="p-3 text-right font-bold text-slate-800">৳{lineTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-slate-700">
                <span className="text-slate-500">Estimated Total: </span>
                <span className="font-bold text-slate-900 text-base">৳{calculatedTotal.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setPoOpen(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={createPOMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                  {createPOMutation.isPending && <LuRefreshCw className="animate-spin h-4 w-4 mr-2" />}
                  Confirm &amp; Generate PO
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Threshold Config Modal ─────────────────────────────────────────────── */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">Threshold Config</DialogTitle>
          </DialogHeader>
          {configAlert && (
            <form onSubmit={configForm.handleSubmit((v) => updateThresholdMutation.mutate(v))} className="space-y-4 pt-2">
              <div className="bg-slate-50 p-3 rounded-xl border">
                <p className="text-xs text-slate-500">Configuring thresholds for:</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">{configAlert.productName}</p>
                <p className="text-xs text-slate-500">Location: {configAlert.locationName}</p>
              </div>
              <input type="hidden" {...configForm.register("productId")} />
              <input type="hidden" {...configForm.register("locationId")} />
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Minimum Safety Stock *</label>
                <input type="number" {...configForm.register("minimumQuantity")} className="w-full bg-slate-50 border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3" />
                {configForm.formState.errors.minimumQuantity && (
                  <p className="text-red-500 text-[10px] mt-0.5">{configForm.formState.errors.minimumQuantity.message}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Standard Reorder Quantity *</label>
                <input type="number" {...configForm.register("reorderQuantity")} className="w-full bg-slate-50 border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3" />
                {configForm.formState.errors.reorderQuantity && (
                  <p className="text-red-500 text-[10px] mt-0.5">{configForm.formState.errors.reorderQuantity.message}</p>
                )}
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setConfigOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateThresholdMutation.isPending} className="bg-indigo-600 text-white">
                  {updateThresholdMutation.isPending && <LuRefreshCw className="animate-spin h-4 w-4 mr-2" />}
                  Save Configuration
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
