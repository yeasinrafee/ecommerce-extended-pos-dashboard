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
  LuTriangleAlert,
  LuSlidersHorizontal,
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

// Schema
const lowStockConfigSchema = zod.object({
  productId: zod.string().min(1, "Product is required"),
  locationId: zod.string().nullable().optional(),
  minimumQuantity: zod.coerce.number().min(0, "Must be positive"),
  reorderQuantity: zod.coerce.number().min(0, "Must be positive"),
});

type LowStockConfigFormValues = zod.infer<typeof lowStockConfigSchema>;

interface LowStockAlert {
  productId: string;
  productName: string;
  sku: string;
  locationId: string;
  locationName: string;
  currentQuantity: number;
  minimumQuantity: number;
  reorderQuantity: number;
}

export default function LowStockAlertsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedLocation, setSelectedLocation] = useState("");

  const [configOpen, setConfigOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<LowStockAlert | null>(
    null,
  );

  // Queries
  const { data: alertsRes, isLoading: isLoadingAlerts } = useQuery({
    queryKey: ["low-stock", "alerts", page, selectedLocation],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<any>>(
        "/stocks/low-stock-alerts",
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
          : ((p.data as any)?.data ?? [])) as LowStockAlert[],
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
    queryKey: ["low-stock", "locations"],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<any[]>>(
        "/stocks/locations/get-all",
      );
      return response.data.data;
    },
  });

  // Mutation
  const updateThresholdMutation = useMutation({
    mutationFn: async (payload: LowStockConfigFormValues) => {
      const response = await apiClient.post<ApiResponse<any>>(
        "/stocks/low-stock-configs",
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Low stock alerts configured successfully");
      setConfigOpen(false);
      setSelectedAlert(null);
      queryClient.invalidateQueries({ queryKey: ["low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["stocks"] }); // Invalidate stocks too
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to configure alert safety level",
      );
    },
  });

  // React Hook Form
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

  const handleOpenConfig = (item: LowStockAlert) => {
    setSelectedAlert(item);
    reset({
      productId: item.productId,
      locationId: item.locationId,
      minimumQuantity: item.minimumQuantity,
      reorderQuantity: item.reorderQuantity,
    });
    setConfigOpen(true);
  };

  const onSubmitConfig = (values: LowStockConfigFormValues) => {
    updateThresholdMutation.mutate(values);
  };

  const itemsList = alertsRes?.data || [];
  const meta = alertsRes?.meta || {
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 10,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <LuTriangleAlert className="h-6 w-6 text-red-500" />
            Low Stock Alerts
          </h1>
          <p className="text-xs text-slate-500">
            View products running below safe stock levels and fine-tune safety
            limits.
          </p>
        </div>
      </div>

      {/* Controls */}
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

      {/* Table */}
      <Card className="border-slate-100 shadow-sm overflow-hidden">
        {isLoadingAlerts ? (
          <div className="flex h-64 items-center justify-center">
            <Loader />
          </div>
        ) : itemsList.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <LuTriangleAlert className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium">All stock levels are safe.</p>
            <p className="text-xs text-slate-400 mt-1">
              There are no active alerts currently triggered.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase font-sans">
                  <th className="p-4">Product Name</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4">Location</th>
                  <th className="p-4 text-center">Current Qty</th>
                  <th className="p-4 text-center">Safety Minimum</th>
                  <th className="p-4 text-center">Suggested Reorder Size</th>
                  <th className="p-4 text-center">Deficit</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-sans">
                {itemsList.map((alert) => {
                  const deficit = alert.minimumQuantity - alert.currentQuantity;
                  return (
                    <tr
                      key={`${alert.productId}-${alert.locationId}`}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4 font-semibold text-slate-900">
                        {alert.productName}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500">
                        {alert.sku ?? (
                          <span className="text-slate-300 italic">—</span>
                        )}
                      </td>
                      <td className="p-4">{alert.locationName}</td>
                      <td className="p-4 text-center font-bold text-red-600 bg-red-50/50">
                        {alert.currentQuantity}
                      </td>
                      <td className="p-4 text-center font-medium text-slate-600">
                        {alert.minimumQuantity}
                      </td>
                      <td className="p-4 text-center font-medium text-slate-500">
                        {alert.reorderQuantity}
                      </td>
                      <td className="p-4 text-center font-bold text-red-700">
                        {deficit > 0 ? (
                          `-${deficit}`
                        ) : (
                          <span className="text-amber-600">0</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          variant="ghost"
                          onClick={() => handleOpenConfig(alert)}
                          className="text-xs text-indigo-600 hover:bg-indigo-50 font-medium px-3 py-1.5 rounded-xl border border-slate-200"
                        >
                          <LuSlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />{" "}
                          Reorder Config
                        </Button>
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

      {/* Threshold Config Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">
              Threshold Safety Config
            </DialogTitle>
          </DialogHeader>

          {selectedAlert && (
            <form
              onSubmit={handleSubmit(onSubmitConfig)}
              className="space-y-4 pt-2"
            >
              <div className="bg-slate-50 p-3 rounded-xl border mb-3">
                <p className="text-xs text-slate-500">
                  Configuring thresholds for:
                </p>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {selectedAlert.productName}
                </p>
                <p className="text-xs text-slate-500">
                  Location: {selectedAlert.locationName}
                </p>
              </div>

              <input type="hidden" {...register("productId")} />
              <input type="hidden" {...register("locationId")} />

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    Minimum Safety Stock Level *
                  </label>
                  <input
                    type="number"
                    {...register("minimumQuantity")}
                    className="w-full bg-slate-50 border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3"
                  />
                  {errors.minimumQuantity && (
                    <p className="text-red-500 text-[10px] mt-0.5">
                      {errors.minimumQuantity.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    Standard Reorder Quantity *
                  </label>
                  <input
                    type="number"
                    {...register("reorderQuantity")}
                    className="w-full bg-slate-50 border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3"
                  />
                  {errors.reorderQuantity && (
                    <p className="text-red-500 text-[10px] mt-0.5">
                      {errors.reorderQuantity.message}
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfigOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateThresholdMutation.isPending}
                  className="bg-indigo-600 text-white"
                >
                  {updateThresholdMutation.isPending ? (
                    <LuRefreshCw className="animate-spin h-4 w-4 mr-2" />
                  ) : null}
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
