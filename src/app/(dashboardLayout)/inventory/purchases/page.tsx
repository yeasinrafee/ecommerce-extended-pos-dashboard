"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import ReactDOM from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { apiClient } from "@/lib/api";
import { ApiResponse } from "@/types/auth";
import {
  LuSearch,
  LuPlus,
  LuTrash,
  LuRefreshCw,
  LuShoppingCart,
  LuMapPin,
  LuClipboardList,
  LuPencil,
  LuBan,
  LuCircleCheck,
  LuBoxes,
  LuChevronDown,
  LuCheck,
  LuX,
} from "react-icons/lu";
import { MoreHorizontal } from "lucide-react";
import { toast } from "react-hot-toast";
import Loader from "@/components/Common/Loader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PaginationControl } from "@/components/Common/Pagination";
import DeleteModal from "@/components/Common/DeleteModal";

// ─── Schema ────────────────────────────────────────────────────────────────────
const purchaseOrderItemSchema = zod.object({
  productId: zod.string().min(1, "Product is required"),
  quantity: zod.number().min(1, "Quantity must be at least 1"),
  unitPrice: zod.number().min(0, "Price must be non-negative"),
  taxPercent: zod.number().min(0).max(100).default(0),
  discountPercent: zod.number().min(0).max(100).default(0),
});

const purchaseOrderFormSchema = zod.object({
  supplierId: zod.coerce.number().min(1, "Supplier is required"),
  locationId: zod.string().min(1, "Location is required"),
  orderDate: zod.string().min(1, "Order date is required"),
  expectedDate: zod.string().optional(),
  notes: zod.string().optional(),
  items: zod
    .array(purchaseOrderItemSchema)
    .min(1, "At least one item is required"),
});

type PurchaseOrderFormValues = zod.infer<typeof purchaseOrderFormSchema>;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

interface POItem {
  id: string;
  productId: string;
  quantity: number;
  receivedQuantity: number;
  unitPrice: number;
  taxPercent: number;
  taxAmount: number;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
  product: { name: string; sku: string };
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: number;
  supplier: { name: string; companyName: string };
  locationId: string;
  location: { name: string };
  orderDate: string;
  expectedDate?: string;
  status: "DRAFT" | "PENDING" | "APPROVED" | "CANCELLED";
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  netAmount: number;
  notes?: string;
  createdAt: string;
  items: POItem[];
}

// ─── Status helpers ────────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-700",
};

const INPUT_CLS =
  "w-full h-10 bg-white border border-slate-200 text-slate-800 text-sm rounded-lg outline-none px-3 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all";

// ─── ProductCombobox (same pattern as GRN) ─────────────────────────────────────
function ProductCombobox({
  value,
  onChange,
  options,
  placeholder = "Select a product…",
  disabled = false,
  hasError = false,
}: {
  value: string;
  onChange: (id: string) => void;
  options: ProductOption[];
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const selected = options.find((o) => o.id === value);
  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.sku || "").toLowerCase().includes(q),
    );
  }, [search, options]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (dropdownRef.current?.contains(t)) return;
      setOpen(false);
      setSearch("");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current)
      setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  const handleOpen = () => {
    if (disabled) return;
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < 320 && spaceAbove > spaceBelow;
      setDropdownStyle(
        openUpward
          ? {
              position: "fixed",
              bottom: window.innerHeight - rect.top + 4,
              left: rect.left,
              width: Math.max(rect.width, 300),
              zIndex: 9999,
            }
          : {
              position: "fixed",
              top: rect.bottom + 4,
              left: rect.left,
              width: Math.max(rect.width, 300),
              zIndex: 9999,
            },
      );
    }
    setOpen((o) => !o);
    setSearch("");
  };

  return (
    <div ref={ref} className="relative w-full">
      <div
        className={`
        w-full flex items-center h-10 rounded-lg border text-sm transition-all overflow-hidden
        ${
          disabled
            ? "bg-slate-50 border-slate-200 opacity-60"
            : open
              ? "bg-white border-indigo-500 ring-2 ring-indigo-100"
              : hasError
                ? "bg-white border-red-300 hover:border-red-400"
                : "bg-white border-slate-200 hover:border-slate-400"
        }
      `}
      >
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={handleOpen}
          className="flex items-center gap-2 min-w-0 flex-1 px-3 h-full text-left cursor-pointer disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selected ? (
              <>
                <span className="font-medium text-slate-900 truncate text-xs">
                  {selected.name}
                </span>
                <span className="font-mono text-[10px] text-slate-400 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded">
                  {selected.sku || "—"}
                </span>
              </>
            ) : (
              <span className="text-slate-400 text-xs">{placeholder}</span>
            )}
          </div>
        </button>
        {selected && !disabled ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setOpen(false);
              setSearch("");
            }}
            className="px-2 h-full flex items-center text-slate-300 hover:text-red-400 transition-colors shrink-0"
            tabIndex={-1}
          >
            <LuX className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="px-2.5 flex items-center shrink-0 pointer-events-none">
            <LuChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </span>
        )}
      </div>

      {open &&
        typeof document !== "undefined" &&
        ReactDOM.createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden pointer-events-auto"
          >
            {/* Search */}
            <div className="p-2 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 h-9 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                <LuSearch className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or SKU…"
                  className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder:text-slate-400"
                />
                {search && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setSearch("")}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <LuX className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div
              className="max-h-56 overflow-y-auto"
              onMouseDown={(e) => e.preventDefault()}
            >
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <LuBoxes className="h-7 w-7 text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-500">
                    No products found
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Try a different name or SKU
                  </p>
                </div>
              ) : (
                <div className="p-1">
                  {filtered.map((opt) => {
                    const isSel = value === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onChange(opt.id);
                          setOpen(false);
                          setSearch("");
                        }}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${isSel ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                      >
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${isSel ? "text-indigo-700" : "text-slate-900"}`}
                          >
                            {opt.name}
                          </p>
                          <p className="text-[11px] font-mono text-slate-400">
                            {opt.sku || "—"}
                          </p>
                        </div>
                        {isSel && (
                          <LuCheck className="h-4 w-4 text-indigo-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {filtered.length > 0 && (
              <div className="px-3 py-2 border-t border-slate-100 bg-slate-50">
                <p className="text-[11px] text-slate-400">
                  {filtered.length} product{filtered.length !== 1 ? "s" : ""}
                  {search ? " matched" : " available"}
                </p>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [detailsPO, setDetailsPO] = useState<PurchaseOrder | null>(null);
  const [actionConfirmTarget, setActionConfirmTarget] = useState<{
    id: string;
    action: "approve" | "cancel";
  } | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: poRes, isLoading: isLoadingPOs } = useQuery({
    queryKey: [
      "purchases",
      "list",
      page,
      limit,
      searchTerm,
      selectedStatus,
      selectedSupplier,
      selectedLocation,
    ],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>(
        "/purchase-orders/get-all-paginated",
        {
          params: {
            page,
            limit,
            searchTerm: searchTerm || undefined,
            status: selectedStatus || undefined,
            supplierId: selectedSupplier || undefined,
            locationId: selectedLocation || undefined,
          },
        },
      );
      const payload = r.data.data;
      if (Array.isArray(payload))
        return {
          data: payload,
          meta: { page: 1, totalPages: 1, total: payload.length, limit },
        };
      return payload;
    },
  });

  const { data: suppliersRes } = useQuery({
    queryKey: ["purchases", "suppliers"],
    queryFn: async () =>
      (await apiClient.get<ApiResponse<any[]>>("/suppliers/get-all")).data.data,
  });

  const { data: locationsRes } = useQuery({
    queryKey: ["purchases", "locations"],
    queryFn: async () =>
      (await apiClient.get<ApiResponse<any[]>>("/stocks/locations/get-all"))
        .data.data,
  });

  const { data: productsRes } = useQuery({
    queryKey: ["purchases", "products"],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>("/products/get-all");
      const data = r.data.data;
      return Array.isArray(data) ? data : (data as any)?.data || [];
    },
  });

  // product options for combobox
  const productOptions: ProductOption[] = useMemo(
    () =>
      (productsRes ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku ?? "—",
      })),
    [productsRes],
  );

  // ── Fetch single PO ───────────────────────────────────────────────────────────
  const fetchPOById = async (id: string): Promise<PurchaseOrder> => {
    return (
      await apiClient.get<ApiResponse<PurchaseOrder>>(
        `/purchase-orders/get/${id}`,
      )
    ).data.data as PurchaseOrder;
  };

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createPOMutation = useMutation({
    mutationFn: async (payload: PurchaseOrderFormValues) =>
      (
        await apiClient.post<ApiResponse<any>>(
          "/purchase-orders/create",
          payload,
        )
      ).data,
    onSuccess: () => {
      toast.success("Purchase Order created");
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to create PO"),
  });

  const updatePOMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: PurchaseOrderFormValues;
    }) =>
      (
        await apiClient.patch<ApiResponse<any>>(
          `/purchase-orders/update/${id}`,
          payload,
        )
      ).data,
    onSuccess: () => {
      toast.success("Purchase Order updated");
      setFormOpen(false);
      setEditingPO(null);
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to update PO"),
  });

  const approvePOMutation = useMutation({
    mutationFn: async (id: string) =>
      (
        await apiClient.patch<ApiResponse<any>>(
          `/purchase-orders/approve/${id}`,
        )
      ).data,
    onSuccess: () => {
      toast.success("Purchase Order approved");
      setActionConfirmTarget(null);
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to approve PO"),
  });

  const cancelPOMutation = useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.patch<ApiResponse<any>>(`/purchase-orders/cancel/${id}`))
        .data,
    onSuccess: () => {
      toast.success("Purchase Order cancelled");
      setActionConfirmTarget(null);
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to cancel PO"),
  });

  // ── Form ─────────────────────────────────────────────────────────────────────
  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderFormSchema) as any,
    defaultValues: {
      supplierId: 0,
      locationId: "",
      orderDate: new Date().toISOString().substring(0, 10),
      expectedDate: "",
      notes: "",
      items: [
        {
          productId: "",
          quantity: 1,
          unitPrice: 0,
          taxPercent: 0,
          discountPercent: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  // useWatch subscribes to live field changes — watch() snapshot can be stale
  const watchedItems = useWatch({ control, name: "items" });

  useEffect(() => {
    if (editingPO) {
      const arr = Array.isArray(editingPO.items) ? editingPO.items : [];
      reset({
        supplierId: editingPO.supplierId,
        locationId: editingPO.locationId,
        orderDate: new Date(editingPO.orderDate).toISOString().substring(0, 10),
        expectedDate: editingPO.expectedDate
          ? new Date(editingPO.expectedDate).toISOString().substring(0, 10)
          : "",
        notes: editingPO.notes || "",
        items:
          arr.length > 0
            ? arr.map((i) => ({
                productId: i.productId,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                taxPercent: i.taxPercent ?? 0,
                discountPercent: i.discountPercent ?? 0,
              }))
            : [
                {
                  productId: "",
                  quantity: 1,
                  unitPrice: 0,
                  taxPercent: 0,
                  discountPercent: 0,
                },
              ],
      });
    } else {
      reset({
        supplierId: 0,
        locationId: "",
        orderDate: new Date().toISOString().substring(0, 10),
        expectedDate: "",
        notes: "",
        items: [
          {
            productId: "",
            quantity: 1,
            unitPrice: 0,
            taxPercent: 0,
            discountPercent: 0,
          },
        ],
      });
    }
  }, [editingPO, reset]);

  const calculatedTotals = useMemo(() => {
    let subtotal = 0,
      tax = 0,
      discount = 0;
    watchedItems?.forEach((item) => {
      const q = Number.isFinite(item.quantity) ? item.quantity : 0;
      const p = Number.isFinite(item.unitPrice) ? item.unitPrice : 0;
      const lineVal = q * p;
      const discAmt =
        lineVal *
        ((Number.isFinite(item.discountPercent) ? item.discountPercent : 0) /
          100);
      const taxAmt =
        (lineVal - discAmt) *
        ((Number.isFinite(item.taxPercent) ? item.taxPercent : 0) / 100);
      subtotal += lineVal;
      discount += discAmt;
      tax += taxAmt;
    });
    return { subtotal, tax, discount, net: subtotal - discount + tax };
  }, [watchedItems]);

  const handleProductSelect = (index: number, productId: string) => {
    const prod = productsRes?.find((p: any) => p.id === productId);
    if (prod) {
      // Auto-populate unit price from product base price
      const price = prod.Baseprice ?? prod.basePrice ?? prod.finalPrice ?? 0;
      setValue(`items.${index}.unitPrice`, price, {
        shouldValidate: true,
        shouldDirty: true,
      });
      // Auto-populate quantity from product existing stock or defaultQuantity
      const defaultQty = prod.stock ?? prod.defaultQuantity ?? 1;
      setValue(`items.${index}.quantity`, defaultQty, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };

  const handleEditClick = async (po: PurchaseOrder) => {
    setEditLoading(true);
    try {
      const full = await fetchPOById(po.id);
      setEditingPO(full);
      setFormOpen(true);
    } catch {
      setEditingPO(po);
      setFormOpen(true);
    } finally {
      setEditLoading(false);
    }
  };

  const handleViewClick = async (po: PurchaseOrder) => {
    try {
      setDetailsPO(await fetchPOById(po.id));
    } catch {
      setDetailsPO(po);
    }
  };

  const onSubmit = (values: PurchaseOrderFormValues) => {
    if (editingPO)
      updatePOMutation.mutate({ id: editingPO.id, payload: values });
    else createPOMutation.mutate(values);
  };

  const handleActionConfirm = () => {
    if (!actionConfirmTarget) return;
    if (actionConfirmTarget.action === "approve")
      approvePOMutation.mutate(actionConfirmTarget.id);
    else cancelPOMutation.mutate(actionConfirmTarget.id);
  };

  const itemsList: PurchaseOrder[] = poRes?.data || [];
  const meta = poRes?.meta || { page: 1, totalPages: 1, total: 0, limit };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Purchase Orders</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, review, approve and track vendor procurement workflows.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingPO(null);
            setFormOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 self-start md:self-auto"
        >
          <LuPlus className="h-4 w-4" /> New Purchase Order
        </Button>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <Card className="p-4 border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <LuSearch className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search PO number, supplier…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-9 w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select
            value={selectedSupplier}
            onChange={(e) => {
              setSelectedSupplier(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3"
          >
            <option value="">All Suppliers</option>
            {suppliersRes?.map((sup: any) => (
              <option key={sup.id} value={sup.id}>
                {sup.name}
              </option>
            ))}
          </select>
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
          <Button
            variant="ghost"
            onClick={() => {
              setSearchTerm("");
              setSelectedStatus("");
              setSelectedSupplier("");
              setSelectedLocation("");
            }}
            className="h-10 text-xs border border-slate-200 rounded-xl md:col-span-3"
          >
            Reset Filters
          </Button>
        </div>
      </Card>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <Card className="border-slate-100 shadow-sm overflow-hidden">
        {isLoadingPOs ? (
          <div className="flex h-64 items-center justify-center">
            <Loader />
          </div>
        ) : itemsList.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <LuShoppingCart className="h-10 w-10 text-slate-200 mx-auto mb-2" />
            <p className="text-sm font-medium">No purchase orders found.</p>
            <p className="text-xs text-slate-400 mt-1">
              Try resetting filters or create a new order.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase">
                  <th className="p-4">PO Number</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4 hidden sm:table-cell">Location</th>
                  <th className="p-4 hidden lg:table-cell">Order Date</th>
                  <th className="p-4 hidden lg:table-cell">Expected</th>
                  <th className="p-4 text-right">Net Amount</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {itemsList.map((po) => (
                  <tr
                    key={po.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-4 font-bold text-slate-900">
                      {po.poNumber}
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-900">
                        {po.supplier?.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {po.supplier?.companyName}
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell text-slate-600">
                      {po.location?.name}
                    </td>
                    <td className="p-4 hidden lg:table-cell text-slate-500">
                      {new Date(po.orderDate).toLocaleDateString()}
                    </td>
                    <td className="p-4 hidden lg:table-cell text-slate-500">
                      {po.expectedDate ? (
                        new Date(po.expectedDate).toLocaleDateString()
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-semibold text-slate-900">
                      ৳{(Number(po.netAmount) || 0).toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <Badge
                        className={`font-semibold py-0.5 px-2 text-[10px] uppercase rounded-full border-0 ${statusColors[po.status] || "bg-slate-100 text-slate-700"}`}
                      >
                        {po.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-500"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 rounded-xl border-slate-100 shadow-lg"
                        >
                          <DropdownMenuItem
                            onClick={() => handleViewClick(po)}
                            className="flex items-center gap-2 text-slate-600 cursor-pointer"
                          >
                            View Details
                          </DropdownMenuItem>
                          {po.status === "DRAFT" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleEditClick(po)}
                                disabled={editLoading}
                                className="flex items-center gap-2 text-indigo-600 focus:text-indigo-700 focus:bg-indigo-50 cursor-pointer"
                              >
                                {editLoading ? (
                                  <LuRefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <LuPencil className="h-3.5 w-3.5" />
                                )}
                                Edit Order
                              </DropdownMenuItem>
                            </>
                          )}
                          {(po.status === "DRAFT" ||
                            po.status === "PENDING") && (
                            <DropdownMenuItem
                              onClick={() =>
                                setActionConfirmTarget({
                                  id: po.id,
                                  action: "approve",
                                })
                              }
                              className="flex items-center gap-2 text-green-600 focus:text-green-700 focus:bg-green-50 cursor-pointer"
                            >
                              <LuCircleCheck className="h-3.5 w-3.5" /> Approve
                              PO
                            </DropdownMenuItem>
                          )}
                          {(po.status === "DRAFT" ||
                            po.status === "PENDING") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  setActionConfirmTarget({
                                    id: po.id,
                                    action: "cancel",
                                  })
                                }
                                className="flex items-center gap-2 text-red-500 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                              >
                                <LuBan className="h-3.5 w-3.5" /> Cancel Order
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <PaginationControl
                currentPage={meta.page}
                totalPages={meta.totalPages}
                onPageChange={setPage}
                totalItems={meta.total}
                itemsPerPage={limit}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* ── Create / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          if (!o) {
            setFormOpen(false);
            setEditingPO(null);
            reset();
          }
        }}
        modal={false}
      >
        <DialogContent className="w-full max-w-[calc(100%-1rem)] sm:max-w-3xl lg:max-w-5xl max-h-[95dvh] sm:max-h-[92vh] overflow-y-auto p-0 rounded-xl sm:rounded-2xl">
          <DialogTitle className="sr-only">
            {editingPO ? "Edit PO" : "New Purchase Order"}
          </DialogTitle>

          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  {editingPO
                    ? `Edit Order — ${editingPO.poNumber}`
                    : "New Purchase Order"}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Fill in supplier, items, then save to track procurement.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 shrink-0 text-[11px] text-slate-400">
                <LuShoppingCart className="h-4 w-4 text-indigo-500" />
                <span className="font-medium text-indigo-600">PO</span>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="px-4 sm:px-6 pb-24 pt-4 sm:pt-5 space-y-5 sm:space-y-6"
          >
            {/* Section 1: Order Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <LuMapPin className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Order Details
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">
                    Supplier *
                  </label>
                  <select {...register("supplierId")} className={INPUT_CLS}>
                    <option value={0}>Select Supplier</option>
                    {suppliersRes?.map((sup: any) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name}
                      </option>
                    ))}
                  </select>
                  {errors.supplierId && (
                    <p className="text-red-500 text-[10px]">
                      {errors.supplierId.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">
                    Target Location *
                  </label>
                  <select {...register("locationId")} className={INPUT_CLS}>
                    <option value="">Select Location</option>
                    {locationsRes?.map((loc: any) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                  {errors.locationId && (
                    <p className="text-red-500 text-[10px]">
                      {errors.locationId.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">
                    Order Date *
                  </label>
                  <input
                    type="date"
                    {...register("orderDate")}
                    className={INPUT_CLS}
                  />
                  {errors.orderDate && (
                    <p className="text-red-500 text-[10px]">
                      {errors.orderDate.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">
                    Expected Date{" "}
                    <span className="font-normal text-slate-400">
                      (Optional)
                    </span>
                  </label>
                  <input
                    type="date"
                    {...register("expectedDate")}
                    className={INPUT_CLS}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-200" />

            {/* Section 2: Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <LuClipboardList className="h-3.5 w-3.5 text-indigo-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    Order Items
                  </h3>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      productId: "",
                      quantity: 1,
                      unitPrice: 0,
                      taxPercent: 0,
                      discountPercent: 0,
                    })
                  }
                  className="text-xs h-8 rounded-lg border-indigo-200 text-indigo-600 hover:bg-indigo-50 gap-1.5"
                >
                  <LuPlus className="h-3.5 w-3.5" /> Add Row
                </Button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="p-3 w-2/5">Product *</th>
                      <th className="p-3 text-center">Qty *</th>
                      <th className="p-3 text-center">Unit Cost *</th>
                      <th className="p-3 text-center">Tax %</th>
                      <th className="p-3 text-center">Disc %</th>
                      <th className="p-3 text-right">Line Total</th>
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fields.map((field, index) => {
                      const q = Number.isFinite(watchedItems?.[index]?.quantity)
                        ? watchedItems[index].quantity
                        : 0;
                      const p = Number.isFinite(
                        watchedItems?.[index]?.unitPrice,
                      )
                        ? watchedItems[index].unitPrice
                        : 0;
                      const disc = Number.isFinite(
                        watchedItems?.[index]?.discountPercent,
                      )
                        ? watchedItems[index].discountPercent
                        : 0;
                      const tax = Number.isFinite(
                        watchedItems?.[index]?.taxPercent,
                      )
                        ? watchedItems[index].taxPercent
                        : 0;
                      const base = q * p;
                      const lineTotal =
                        base -
                        base * (disc / 100) +
                        (base - base * (disc / 100)) * (tax / 100);

                      return (
                        <tr key={field.id} className="hover:bg-slate-50/60">
                          {/* ProductCombobox */}
                          <td className="p-2">
                            <input
                              type="hidden"
                              {...register(`items.${index}.productId` as const)}
                            />
                            <ProductCombobox
                              value={watchedItems?.[index]?.productId ?? ""}
                              onChange={(id) => {
                                setValue(`items.${index}.productId`, id, {
                                  shouldValidate: true,
                                });
                                handleProductSelect(index, id);
                              }}
                              options={productOptions}
                              hasError={!!errors.items?.[index]?.productId}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min={1}
                              {...register(`items.${index}.quantity` as const, {
                                valueAsNumber: true,
                              })}
                              className="w-full h-8 bg-white border border-slate-200 rounded-lg text-center text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              {...register(
                                `items.${index}.unitPrice` as const,
                                { valueAsNumber: true },
                              )}
                              className="w-full h-8 bg-white border border-slate-200 rounded-lg text-center text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              {...register(
                                `items.${index}.taxPercent` as const,
                                { valueAsNumber: true },
                              )}
                              className="w-full h-8 bg-white border border-slate-200 rounded-lg text-center text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              {...register(
                                `items.${index}.discountPercent` as const,
                                { valueAsNumber: true },
                              )}
                              className="w-full h-8 bg-white border border-slate-200 rounded-lg text-center text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
                            />
                          </td>
                          <td className="p-2 text-right font-bold text-slate-800 whitespace-nowrap">
                            ৳{lineTotal.toFixed(2)}
                          </td>
                          <td className="p-2 text-center">
                            {fields.length > 1 && (
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="text-red-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-50"
                              >
                                <LuTrash className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {errors.items && (
                <p className="text-red-500 text-[10px]">
                  {errors.items.message as string}
                </p>
              )}
            </div>

            <div className="border-t border-dashed border-slate-200" />

            {/* Section 3: Notes + Summary */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <LuClipboardList className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Notes &amp; Summary
                </h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">
                    Internal Notes{" "}
                    <span className="font-normal text-slate-400">
                      (Optional)
                    </span>
                  </label>
                  <textarea
                    rows={4}
                    {...register("notes")}
                    placeholder="Shipping instructions, special conditions…"
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                  />
                </div>
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 self-start">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Order Summary
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span>৳{calculatedTotals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-red-500">
                      <span>Discount (−)</span>
                      <span>৳{calculatedTotals.discount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600">
                      <span>Tax (+)</span>
                      <span>৳{calculatedTotals.tax.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 mt-1 flex justify-between font-bold text-slate-900 text-sm">
                      <span>Net Total</span>
                      <span>৳{calculatedTotals.net.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Sticky footer */}
          <div className="sticky bottom-0 bg-white border-t border-slate-100 px-4 sm:px-6 py-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormOpen(false);
                setEditingPO(null);
                reset();
              }}
              className="rounded-xl text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              disabled={
                createPOMutation.isPending || updatePOMutation.isPending
              }
              onClick={handleSubmit(onSubmit)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs h-9 gap-1.5"
            >
              {(createPOMutation.isPending || updatePOMutation.isPending) && (
                <LuRefreshCw className="animate-spin h-3.5 w-3.5" />
              )}
              {editingPO ? "Update Order" : "Save Purchase Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── View Details Dialog (GRN style) ──────────────────────────────────── */}
      <Dialog open={!!detailsPO} onOpenChange={() => setDetailsPO(null)}>
        <DialogContent className="w-full max-w-[calc(100%-1rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl sm:rounded-2xl p-0">
          <DialogTitle className="sr-only">PO Details</DialogTitle>

          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <LuShoppingCart className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {detailsPO?.poNumber}
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Purchase Order Details
                  </p>
                </div>
              </div>
              {detailsPO && (
                <Badge
                  className={`font-semibold py-0.5 px-2.5 text-[10px] uppercase rounded-full border-0 shrink-0 ${statusColors[detailsPO.status]}`}
                >
                  {detailsPO.status}
                </Badge>
              )}
            </div>
          </div>

          {detailsPO && (
            <div className="px-5 py-4 space-y-4">
              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                  <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">
                    Supplier
                  </p>
                  <p className="font-semibold text-slate-900">
                    {detailsPO.supplier?.name}
                  </p>
                  {detailsPO.supplier?.companyName && (
                    <p className="text-[10px] text-slate-400">
                      {detailsPO.supplier.companyName}
                    </p>
                  )}
                </div>
                <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                  <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">
                    Location
                  </p>
                  <p className="font-semibold text-slate-900">
                    {detailsPO.location?.name}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                  <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">
                    Order Date
                  </p>
                  <p className="font-semibold text-slate-900">
                    {new Date(detailsPO.orderDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                  <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">
                    Expected Delivery
                  </p>
                  <p className="font-semibold text-slate-900">
                    {detailsPO.expectedDate
                      ? new Date(detailsPO.expectedDate).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Items table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[520px]">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
                      <tr>
                        <th className="px-3 py-2.5">Product</th>
                        <th className="px-3 py-2.5 text-center">Ordered</th>
                        <th className="px-3 py-2.5 text-center">Received</th>
                        <th className="px-3 py-2.5 text-center">Unit Cost</th>
                        <th className="px-3 py-2.5 text-center">Tax / Disc</th>
                        <th className="px-3 py-2.5 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailsPO.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <p className="font-medium text-slate-900 truncate max-w-[160px]">
                              {item.product?.name}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400">
                              {item.product?.sku || "—"}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-slate-800">
                            {item.quantity}
                          </td>
                          <td className="px-3 py-2 text-center text-slate-500">
                            {item.receivedQuantity}
                          </td>
                          <td className="px-3 py-2 text-center text-slate-700">
                            ৳{(Number(item.unitPrice) || 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-center text-slate-400">
                            +{item.taxPercent}% / −{item.discountPercent}%
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900">
                            ৳{(Number(item.totalAmount) || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {detailsPO.notes && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Internal Notes
                  </p>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">
                    {detailsPO.notes}
                  </p>
                </div>
              )}

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-56 text-xs space-y-1.5">
                  <div className="flex justify-between text-emerald-600">
                    <span>Tax</span>
                    <span>
                      +৳{(Number(detailsPO.taxAmount) || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-red-500">
                    <span>Discount</span>
                    <span>
                      −৳{(Number(detailsPO.discountAmount) || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900 text-sm">
                    <span>Net Amount</span>
                    <span>
                      ৳{(Number(detailsPO.netAmount) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Workflow stepper */}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  PO Workflow
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {(["DRAFT", "PENDING", "APPROVED"] as const).map(
                    (step, i) => {
                      const active = detailsPO.status === step;
                      const done =
                        step === "PENDING" && detailsPO.status === "APPROVED";
                      return (
                        <React.Fragment key={step}>
                          {i > 0 && (
                            <div className="h-0.5 w-6 bg-slate-200 shrink-0" />
                          )}
                          <div className="flex items-center gap-1">
                            <div
                              className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px]
                            ${
                              active
                                ? step === "APPROVED"
                                  ? "bg-green-500 text-white"
                                  : step === "PENDING"
                                    ? "bg-amber-500 text-white"
                                    : "bg-indigo-600 text-white"
                                : done
                                  ? "bg-indigo-100 text-indigo-700"
                                  : "bg-slate-100 text-slate-400"
                            }`}
                            >
                              {i + 1}
                            </div>
                            <span
                              className={`text-xs font-semibold ${active || done ? "text-slate-800" : "text-slate-400"}`}
                            >
                              {step}
                            </span>
                          </div>
                        </React.Fragment>
                      );
                    },
                  )}
                  {detailsPO.status === "CANCELLED" && (
                    <>
                      <div className="h-0.5 w-6 bg-red-200 shrink-0" />
                      <div className="flex items-center gap-1">
                        <div className="h-5 w-5 bg-red-100 text-red-700 rounded-full flex items-center justify-center font-bold text-[10px]">
                          ✕
                        </div>
                        <span className="text-xs font-semibold text-red-600">
                          CANCELLED
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailsPO(null)}
                  className="text-xs h-8 rounded-lg"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Confirm Action ───────────────────────────────────────────────────── */}
      <DeleteModal
        open={!!actionConfirmTarget}
        onOpenChange={(o) => {
          if (!o) setActionConfirmTarget(null);
        }}
        title={
          actionConfirmTarget?.action === "approve"
            ? "Approve Purchase Order"
            : "Cancel Purchase Order"
        }
        description={
          actionConfirmTarget?.action === "approve"
            ? "Are you sure you want to approve this PO? Stock will update once a GRN is created against it."
            : "Are you sure you want to cancel this PO? This cannot be undone if items have been received."
        }
        loading={approvePOMutation.isPending || cancelPOMutation.isPending}
        onConfirm={handleActionConfirm}
        confirmLabel={
          actionConfirmTarget?.action === "approve" ? "Approve" : "Cancel Order"
        }
        cancelLabel="Go Back"
      />
    </div>
  );
}
