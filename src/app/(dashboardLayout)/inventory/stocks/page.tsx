"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { apiClient } from "@/lib/api";
import { ApiResponse } from "@/types/auth";
import {
  LuSearch,
  LuRefreshCw,
  LuSlidersHorizontal,
  LuWarehouse,
  LuTrendingUp,
} from "react-icons/lu";
import { toast } from "react-hot-toast";
import Loader from "@/components/Common/Loader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PaginationControl } from "@/components/Common/Pagination";

// ─── Zod schema ───────────────────────────────────────────────────────────────
const lowStockConfigSchema = zod.object({
  productId: zod.string().min(1, "Product is required"),
  locationId: zod.string().nullable().optional(),
  minimumQuantity: zod.coerce.number().min(0),
  reorderQuantity: zod.coerce.number().min(0),
});
type LowStockConfigFormValues = zod.infer<typeof lowStockConfigSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────
interface StockItem {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  reservedQuantity: number;
  product: {
    name: string;
    sku: string;
    basePrice: number;
    Baseprice?: number;
  };
  location: {
    name: string;
    code: string;
  };
  updatedAt: string;
}

interface StockValuationSummary {
  totalUniqueProducts: number;
  totalPhysicalQuantity: number;
  totalReservedQuantity: number;
  totalValueCost: number;
  totalValueRetail: number;
}

export default function LocationStocksPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(
    null,
  );

  // ─── /stocks/get-all-paginated ────────────────────────────────────────────
  const { data: stocksRes, isLoading: isLoadingStocks } = useQuery({
    queryKey: ["stocks", "list", page, limit, searchTerm, selectedLocation],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<any>>(
        "/stocks/get-all-paginated",
        {
          params: {
            page,
            limit,
            searchTerm: searchTerm || undefined,
            locationId: selectedLocation || undefined,
          },
        },
      );
      const payload = response.data.data;
      // Handle both paginated object { data: [], meta: {} } and raw array
      if (Array.isArray(payload)) {
        return {
          data: payload,
          meta: { page: 1, totalPages: 1, total: payload.length, limit },
        };
      }
      return payload; // { data: [...], meta: {...} }
    },
  });

  // ─── /stocks/reports/current — for summary cards ────────────────────────
  const { data: reportRes } = useQuery({
    queryKey: ["stocks", "report-summary", selectedLocation],
    queryFn: async () => {
      const response = await apiClient.get<
        ApiResponse<{
          summary: StockValuationSummary;
          locationBreakdown: any[];
        }>
      >("/stocks/reports/current", {
        params: { locationId: selectedLocation || undefined },
      });
      return response.data.data;
    },
  });

  // ─── /stocks/locations/get-all ───────────────────────────────────────────
  const { data: locationsRes } = useQuery({
    queryKey: ["stocks", "locations"],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any[]>>(
        "/stocks/locations/get-all",
      );
      return r.data.data;
    },
  });

  // ─── Low stock config mutation ────────────────────────────────────────────
  const configMutation = useMutation({
    mutationFn: async (payload: LowStockConfigFormValues) => {
      const r = await apiClient.post<ApiResponse<any>>(
        "/stocks/low-stock-configs",
        payload,
      );
      return r.data;
    },
    onSuccess: () => {
      toast.success("Reorder config saved");
      setConfigOpen(false);
      setSelectedStockItem(null);
      queryClient.invalidateQueries({ queryKey: ["stocks"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to save config");
    },
  });

  // ─── Form ─────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LowStockConfigFormValues>({
    resolver: zodResolver(lowStockConfigSchema) as any,
    defaultValues: {
      productId: "",
      locationId: null,
      minimumQuantity: 10,
      reorderQuantity: 50,
    },
  });

  const handleOpenConfig = (item: StockItem) => {
    setSelectedStockItem(item);
    reset({
      productId: item.productId,
      locationId: item.locationId,
      minimumQuantity: 10,
      reorderQuantity: 50,
    });
    setConfigOpen(true);
  };

  const summary = reportRes?.summary;
  const itemsList: StockItem[] = stocksRes?.data || [];
  const meta = stocksRes?.meta || { page: 1, totalPages: 1, total: 0, limit };

  const getStatusBadge = (available: number) => {
    if (available === 0)
      return (
        <Badge className="bg-red-100 text-red-800 font-semibold py-0.5 px-2 text-[10px] rounded-full border-0">
          Out of Stock
        </Badge>
      );
    if (available < 15)
      return (
        <Badge className="bg-amber-100 text-amber-800 font-semibold py-0.5 px-2 text-[10px] rounded-full border-0">
          Low Stock
        </Badge>
      );
    return (
      <Badge className="bg-green-100 text-green-800 font-semibold py-0.5 px-2 text-[10px] rounded-full border-0">
        In Stock
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Location-wise Stock Levels
          </h1>
          <p className="text-xs text-slate-500">
            Real-time physical, reserved, and available stock across all
            warehouses and stores.
          </p>
        </div>
      </div>

      {/* Summary Cards — from /stocks/reports/current */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4 border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Distinct Products
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {summary.totalUniqueProducts ?? 0}
              </p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <LuWarehouse className="h-5 w-5" />
            </div>
          </Card>
          <Card className="p-4 border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Physical Qty
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {summary.totalPhysicalQuantity.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400">
                {summary.totalReservedQuantity} reserved
              </p>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <LuTrendingUp className="h-5 w-5" />
            </div>
          </Card>
          <Card className="p-4 border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Cost Value
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                $
                {summary.totalValueCost.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <LuTrendingUp className="h-5 w-5" />
            </div>
          </Card>
          <Card className="p-4 border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Retail Value
              </p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">
                $
                {summary.totalValueRetail.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <LuTrendingUp className="h-5 w-5" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <LuSearch className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search product name or SKU..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-9 w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none border"
            />
          </div>
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
                {loc.name} ({loc.code})
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Stock Table — from /stocks/get-all-paginated */}
      <Card className="border-slate-100 shadow-sm overflow-hidden">
        {isLoadingStocks ? (
          <div className="flex h-64 items-center justify-center">
            <Loader />
          </div>
        ) : itemsList.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <LuWarehouse className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-medium">No stock records found.</p>
            <p className="text-xs text-slate-400 mt-1">
              Receive goods via GRN to populate stock levels.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase">
                  <th className="p-4">Product</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4">Location</th>
                  <th className="p-4 text-center">Physical Qty</th>
                  <th className="p-4 text-center">Reserved</th>
                  <th className="p-4 text-center">Available</th>
                  <th className="p-4 text-right">Cost / Unit</th>
                  <th className="p-4 text-right">Total Value</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Config</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {itemsList.map((item) => {
                  const available = item.quantity - item.reservedQuantity;
                  const unitCost =
                    item.product?.Baseprice ?? item.product?.basePrice ?? 0;
                  const totalValue = item.quantity * unitCost;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-semibold text-slate-900">
                          {item.product?.name}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500">
                        {item.product?.sku}
                      </td>
                      <td className="p-4 text-slate-700">
                        <div className="font-medium">{item.location?.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.location?.code}
                        </div>
                      </td>
                      <td className="p-4 text-center font-semibold text-slate-900">
                        {item.quantity}
                      </td>
                      <td className="p-4 text-center text-slate-400">
                        {item.reservedQuantity}
                      </td>
                      <td className="p-4 text-center font-bold text-indigo-600">
                        {available}
                      </td>
                      <td className="p-4 text-right text-slate-600">
                        ${unitCost.toFixed(2)}
                      </td>
                      <td className="p-4 text-right font-semibold text-slate-800">
                        ${totalValue.toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        {getStatusBadge(available)}
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          variant="ghost"
                          onClick={() => handleOpenConfig(item)}
                          className="text-xs text-indigo-600 hover:bg-indigo-50 font-medium px-2 py-1.5 h-auto rounded-xl border border-slate-200"
                        >
                          <LuSlidersHorizontal className="mr-1 h-3.5 w-3.5" />{" "}
                          Config
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <PaginationControl
                  currentPage={meta.page}
                  totalPages={meta.totalPages}
                  onPageChange={setPage}
                  totalItems={meta.total}
                  itemsPerPage={limit}
                  onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
                />
              </div>
          </div>
        )}
      </Card>

      {/* Reorder Config Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">
              Reorder Config
            </DialogTitle>
          </DialogHeader>

          {selectedStockItem && (
            <form
              onSubmit={handleSubmit((v) => configMutation.mutate(v))}
              className="space-y-4 pt-2"
            >
              <div className="bg-slate-50 p-3 rounded-xl border">
                <p className="text-xs text-slate-500">
                  Configuring thresholds for:
                </p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  {selectedStockItem.product?.name}
                </p>
                <p className="text-xs text-slate-400">
                  {selectedStockItem.product?.sku} ·{" "}
                  {selectedStockItem.location?.name}
                </p>
              </div>

              <input type="hidden" {...register("productId")} />
              <input type="hidden" {...register("locationId")} />

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Minimum Safety Stock *
                </label>
                <input
                  type="number"
                  {...register("minimumQuantity")}
                  className="w-full bg-slate-50 border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3"
                  placeholder="e.g. 10"
                />
                {errors.minimumQuantity && (
                  <p className="text-red-500 text-[10px] mt-0.5">
                    {errors.minimumQuantity.message}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Alert triggers when available qty drops below this.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Standard Reorder Quantity *
                </label>
                <input
                  type="number"
                  {...register("reorderQuantity")}
                  className="w-full bg-slate-50 border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3"
                  placeholder="e.g. 50"
                />
                {errors.reorderQuantity && (
                  <p className="text-red-500 text-[10px] mt-0.5">
                    {errors.reorderQuantity.message}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Suggested PO quantity when reorder is needed.
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfigOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={configMutation.isPending}
                  className="bg-indigo-600 text-white"
                >
                  {configMutation.isPending ? (
                    <LuRefreshCw className="animate-spin h-4 w-4 mr-2" />
                  ) : null}
                  Save Config
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
