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

// ─── Validation ────────────────────────────────────────────────────────────────
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
        productName: zod.string().optional(), // display-only, not sent
        sku: zod.string().nullable().optional(), // display-only, not sent
        quantity: zod.number().min(1),
        unitPrice: zod.number().min(0),
        taxPercent: zod.number().default(0),
        discountPercent: zod.number().default(0),
      }),
    )
    .min(1, "Select at least one item"),
});

type POFormValues = zod.infer<typeof poFormSchema>;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ReorderSuggestion {
  productId: string;
  productName: string;
  sku: string | null;
  locationId: string;
  locationName: string;
  currentQuantity: number;
  reorderThreshold: number;
  suggestedReorderQuantity: number;
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ReorderSuggestionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedLocation, setSelectedLocation] = useState("");

  const [selectedSuggestions, setSelectedSuggestions] = useState<
    Record<string, boolean>
  >({});
  const [poOpen, setPoOpen] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: suggestionsRes, isLoading: isLoadingSuggestions } = useQuery({
    queryKey: ["reorder", "suggestions", page, selectedLocation],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<any>>(
        "/stocks/reorder-suggestions",
        {
          params: {
            page,
            limit,
            locationId: selectedLocation || undefined,
          },
        },
      );
      const p = response.data;
      return {
        data: (Array.isArray(p.data)
          ? p.data
          : ((p.data as any)?.data ?? [])) as ReorderSuggestion[],
        meta: (p.meta ||
          (p.data as any)?.meta || {
            page: 1,
            totalPages: 1,
            total: 0,
            limit,
          }) as {
          page: number;
          totalPages: number;
          total: number;
          limit: number;
        },
      };
    },
  });

  const { data: locationsRes } = useQuery({
    queryKey: ["reorder", "locations"],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<any[]>>(
        "/stocks/locations/get-all",
      );
      return response.data.data as any[];
    },
  });

  const { data: suppliersRes } = useQuery({
    queryKey: ["reorder", "suppliers"],
    queryFn: async () => {
      const response =
        await apiClient.get<ApiResponse<any[]>>("/suppliers/get-all");
      return response.data.data as any[];
    },
  });

  // ── Mutation ─────────────────────────────────────────────────────────────────
  const createPOMutation = useMutation({
    mutationFn: async (payload: POFormValues) => {
      // Strip display-only fields before sending
      const body = {
        supplierId: payload.supplierId,
        locationId: payload.locationId,
        orderDate: payload.orderDate,
        expectedDate: payload.expectedDate || undefined,
        notes: payload.notes || undefined,
        items: payload.items.map(
          ({
            productId,
            quantity,
            unitPrice,
            taxPercent,
            discountPercent,
          }) => ({
            productId,
            quantity,
            unitPrice,
            taxPercent,
            discountPercent,
          }),
        ),
      };
      const response = await apiClient.post<ApiResponse<any>>(
        "/purchase-orders/create",
        body,
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Purchase Order generated successfully");
      setPoOpen(false);
      setSelectedSuggestions({});
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["reorder"] });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to create PO",
      );
    },
  });

  // ── Form ─────────────────────────────────────────────────────────────────────
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<POFormValues>({
    resolver: zodResolver(poFormSchema) as any,
    defaultValues: {
      supplierId: 0,
      locationId: "",
      orderDate: new Date().toISOString().substring(0, 10),
      expectedDate: "",
      notes: "Generated from automated reorder suggestions.",
      items: [],
    },
  });

  const { fields } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const toggleSelect = (key: string) =>
    setSelectedSuggestions((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleOpenBulkPO = () => {
    const selectedItems = itemsList.filter(
      (item) => !!selectedSuggestions[`${item.productId}-${item.locationId}`],
    );

    if (selectedItems.length === 0) {
      toast.error("Please select at least one item to reorder");
      return;
    }

    // Use the first selected item's location as default target location
    const targetLocId = selectedItems[0].locationId;

    const poItems = selectedItems.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.suggestedReorderQuantity || 50,
      unitPrice: 0,
      taxPercent: 0,
      discountPercent: 0,
    }));

    reset({
      supplierId: 0,
      locationId: targetLocId,
      orderDate: new Date().toISOString().substring(0, 10),
      expectedDate: "",
      notes: "Generated from automated reorder suggestions.",
      items: poItems,
    });

    setPoOpen(true);
  };

  const calculatedTotals = React.useMemo(() => {
    let subtotal = 0;
    watchedItems?.forEach((item) => {
      subtotal += (item.quantity || 0) * (item.unitPrice || 0);
    });
    return { subtotal };
  }, [watchedItems]);

  const itemsList = suggestionsRes?.data ?? [];
  const meta = suggestionsRes?.meta ?? {
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 10,
  };
  const selectedCount =
    Object.values(selectedSuggestions).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <LuFileText className="h-6 w-6 text-indigo-600" />
            Reorder Suggestions
          </h1>
          <p className="text-xs text-slate-500">
            Automated suggestions based on safety stock thresholds. Select items
            and generate a Purchase Order.
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
            onChange={(e) => {
              setSelectedLocation(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3"
          >
            <option value="">All Locations</option>
            {locationsRes?.map((loc: any) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* ── Table ─────────────────────────────────────────────────────────────── */}
      <Card className="border-slate-100 shadow-sm overflow-hidden">
        {isLoadingSuggestions ? (
          <div className="flex h-64 items-center justify-center">
            <Loader />
          </div>
        ) : itemsList.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <LuPackageSearch className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium">No reorder suggestions.</p>
            <p className="text-xs text-slate-400 mt-1">
              All safety thresholds are satisfied.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase font-sans">
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      className="accent-indigo-600 h-4 w-4 cursor-pointer"
                      checked={
                        itemsList.length > 0 &&
                        itemsList.every(
                          (item) =>
                            selectedSuggestions[
                              `${item.productId}-${item.locationId}`
                            ],
                        )
                      }
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const next: Record<string, boolean> = {};
                        itemsList.forEach((item) => {
                          next[`${item.productId}-${item.locationId}`] =
                            checked;
                        });
                        setSelectedSuggestions(next);
                      }}
                    />
                  </th>
                  <th className="p-4">Product</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4">Location</th>
                  <th className="p-4 text-center">Current Qty</th>
                  <th className="p-4 text-center">Safety Threshold</th>
                  <th className="p-4 text-center text-indigo-700">
                    Suggested Order
                  </th>
                  <th className="p-4 text-center">Deficit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-sans">
                {itemsList.map((item) => {
                  const key = `${item.productId}-${item.locationId}`;
                  const deficit = item.reorderThreshold - item.currentQuantity;
                  const isSelected = !!selectedSuggestions[key];
                  return (
                    <tr
                      key={key}
                      onClick={() => toggleSelect(key)}
                      className={`cursor-pointer transition-colors ${isSelected ? "bg-indigo-50/60" : "hover:bg-slate-50"}`}
                    >
                      <td
                        className="p-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="accent-indigo-600 h-4 w-4 cursor-pointer"
                          checked={isSelected}
                          onChange={() => toggleSelect(key)}
                        />
                      </td>
                      <td className="p-4 font-semibold text-slate-900">
                        {item.productName}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500">
                        {item.sku ?? (
                          <span className="text-slate-300 italic">—</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-600">
                        {item.locationName}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`font-bold ${item.currentQuantity === 0 ? "text-red-600" : "text-orange-500"}`}
                        >
                          {item.currentQuantity}
                        </span>
                      </td>
                      <td className="p-4 text-center text-slate-500 font-medium">
                        {item.reorderThreshold}
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                          {item.suggestedReorderQuantity}
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold">
                        {deficit > 0 ? (
                          <span className="text-red-600">-{deficit}</span>
                        ) : (
                          <span className="text-amber-500">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Showing page {meta.page} of {meta.totalPages} ({meta.total}{" "}
                  entries)
                </p>
                <PaginationControl
                  currentPage={meta.page}
                  totalPages={meta.totalPages}
                  onPageChange={setPage}
                />
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

          <form
            onSubmit={handleSubmit((values) => createPOMutation.mutate(values))}
            className="space-y-5 pt-2"
          >
            {/* PO Header Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Supplier *
                </label>
                <select
                  {...register("supplierId")}
                  className="w-full bg-slate-50 border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3"
                >
                  <option value={0}>Select Supplier</option>
                  {suppliersRes?.map((sup: any) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name || sup.companyName}
                    </option>
                  ))}
                </select>
                {errors.supplierId && (
                  <p className="text-red-500 text-[10px] mt-0.5">
                    {errors.supplierId.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Target Location *
                </label>
                <select
                  {...register("locationId")}
                  className="w-full bg-slate-50 border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3"
                >
                  <option value="">Select Location</option>
                  {locationsRes?.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
                {errors.locationId && (
                  <p className="text-red-500 text-[10px] mt-0.5">
                    {errors.locationId.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Order Date *
                </label>
                <input
                  type="date"
                  {...register("orderDate")}
                  className="w-full bg-slate-50 border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3"
                />
                {errors.orderDate && (
                  <p className="text-red-500 text-[10px] mt-0.5">
                    {errors.orderDate.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  {...register("expectedDate")}
                  className="w-full bg-slate-50 border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Notes
                </label>
                <input
                  type="text"
                  {...register("notes")}
                  className="w-full bg-slate-50 border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3"
                />
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-800">
                Order Items
                <span className="ml-2 text-xs font-normal text-slate-400">
                  ({fields.length} product{fields.length !== 1 ? "s" : ""})
                </span>
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
                      const productName =
                        watchedItems?.[index]?.productName ||
                        field.productName ||
                        "";
                      const sku =
                        watchedItems?.[index]?.sku ?? field.sku ?? null;

                      return (
                        <tr key={field.id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <p className="font-semibold text-slate-900">
                              {productName}
                            </p>
                            {sku && (
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                SKU: {sku}
                              </p>
                            )}
                            <input
                              type="hidden"
                              {...register(`items.${index}.productId` as const)}
                            />
                            <input
                              type="hidden"
                              {...register(
                                `items.${index}.productName` as const,
                              )}
                            />
                            <input
                              type="hidden"
                              {...register(`items.${index}.sku` as const)}
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min={1}
                              {...register(`items.${index}.quantity` as const, {
                                valueAsNumber: true,
                              })}
                              className="w-full border border-slate-200 rounded-lg p-1.5 text-center font-bold bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              {...register(
                                `items.${index}.unitPrice` as const,
                                { valueAsNumber: true },
                              )}
                              className="w-full border border-slate-200 rounded-lg p-1.5 text-right bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="0.1"
                              {...register(
                                `items.${index}.taxPercent` as const,
                                { valueAsNumber: true },
                              )}
                              className="w-full border border-slate-200 rounded-lg p-1.5 text-center bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                          </td>
                          <td className="p-3 text-right font-bold text-slate-800">
                            ৳{lineTotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {errors.items && (
                <p className="text-red-500 text-[10px]">
                  {(errors.items as any)?.message || "Item validation error"}
                </p>
              )}
            </div>

            {/* Footer with total */}
            <DialogFooter className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-slate-700">
                <span className="text-slate-500">Estimated Total: </span>
                <span className="font-bold text-slate-900 text-base">
                  ৳{calculatedTotals.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPoOpen(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createPOMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                >
                  {createPOMutation.isPending ? (
                    <LuRefreshCw className="animate-spin h-4 w-4 mr-2" />
                  ) : null}
                  Confirm &amp; Generate PO
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
