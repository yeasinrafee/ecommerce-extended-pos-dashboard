'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/auth';
import {
  LuSearch, LuPlus, LuTrash, LuEye, LuRefreshCw, LuArrowRight, LuTruck, LuPackage,
  LuChevronDown, LuCheck, LuX, LuWarehouse, LuMapPin, LuBoxes,
} from 'react-icons/lu';
import { toast } from 'react-hot-toast';
import Loader from '@/components/Common/Loader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { PaginationControl } from '@/components/Common/Pagination';
import DeleteModal from '@/components/Common/DeleteModal';
import { LucideAlertCircle, MoreHorizontal } from 'lucide-react';

// ─── Schemas ──────────────────────────────────────────────────────────────────
const transferItemSchema = zod.object({
  productId: zod.string().min(1, 'Product is required'),
  quantity: zod.number().min(1, 'Quantity must be at least 1'),
});

const transferFormSchema = zod.object({
  sourceLocationId: zod.string().min(1, 'Source location is required'),
  destinationLocationId: zod.string().min(1, 'Destination location is required'),
  notes: zod.string().optional(),
  items: zod.array(transferItemSchema).min(1, 'At least one product is required'),
}).refine(d => d.sourceLocationId !== d.destinationLocationId, {
  message: 'Source and Destination must be different',
  path: ['destinationLocationId'],
});

type TransferFormValues = zod.infer<typeof transferFormSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────
interface TransferItem {
  id: string;
  productId: string;
  quantity: number;
  receivedQuantity: number;
  product: { name: string; sku: string };
}

interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceLocationId: string;
  sourceLocation: { name: string; code: string };
  destinationLocationId: string;
  destinationLocation: { name: string; code: string };
  status: 'DRAFT' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';
  notes?: string;
  createdAt: string;
  items: TransferItem[];
}

interface ReceiveItemValue {
  productId: string;
  receivedQuantity: number;
}
interface ReceiveFormValues {
  notes: string;
  items: ReceiveItemValue[];
}

// ─── Product Option type ──────────────────────────────────────────────────────
interface ProductOption {
  id: string;
  name: string;
  sku: string;
  availableQty: number;
}

// ─── Redesigned Product Combobox ──────────────────────────────────────────────
function ProductCombobox({
  value,
  onChange,
  options,
  placeholder = 'Select a product...',
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
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const selected = options.find(o => o.id === value);
  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o =>
      o.name.toLowerCase().includes(q) || o.sku.toLowerCase().includes(q)
    );
  }, [search, options]);

  useEffect(() => {
    if (!open) return;
    
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      // Don't close if clicking inside the trigger wrapper
      if (ref.current?.contains(target)) return;
      // Don't close if clicking inside the portal dropdown
      if (dropdownRef.current?.contains(target)) return;
      
      setOpen(false);
      setSearch('');
    };
    
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const DROPDOWN_HEIGHT = 320; // max estimated height of dropdown in px

  const handleOpen = () => {
    if (!disabled) {
      if (!open && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const openUpward = spaceBelow < DROPDOWN_HEIGHT && spaceAbove > spaceBelow;

        setDropdownStyle(
          openUpward
            ? {
                position: 'fixed',
                bottom: window.innerHeight - rect.top + 4,
                left: rect.left,
                width: Math.max(rect.width, 300),
                zIndex: 9999,
              }
            : {
                position: 'fixed',
                top: rect.bottom + 4,
                left: rect.left,
                width: Math.max(rect.width, 300),
                zIndex: 9999,
              }
        );
      }
      setOpen(o => !o);
      setSearch('');
    }
  };

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger wrapper — split into select button + clear button */}
      <div className={`
        w-full flex items-center h-10 rounded-lg border text-sm transition-all overflow-hidden
        ${disabled
          ? 'bg-slate-50 border-slate-200 opacity-60'
          : open
            ? 'bg-white border-indigo-500 ring-2 ring-indigo-100'
            : hasError
              ? 'bg-white border-red-300 hover:border-red-400'
              : 'bg-white border-slate-200 hover:border-slate-400'
        }
      `}>
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
                <span className="font-medium text-slate-900 truncate">{selected.name}</span>
                <span className="font-mono text-[11px] text-slate-400 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded">
                  {selected.sku}
                </span>
              </>
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
          </div>
        </button>
        {/* Clear button — only shown when a product is selected */}
        {selected && !disabled ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(''); setOpen(false); setSearch(''); }}
            className="px-2 h-full flex items-center text-slate-300 hover:text-red-400 transition-colors shrink-0"
            tabIndex={-1}
          >
            <LuX className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="px-2.5 flex items-center shrink-0 pointer-events-none">
            <LuChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </span>
        )}
      </div>

      {/* Dropdown Panel — rendered via portal to escape overflow:hidden containers */}
      {open && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden pointer-events-auto"
        >
          {/* Search Header — normal mouse behaviour so input receives focus on click */}
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 h-9 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <LuSearch className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or SKU..."
                className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setSearch('')}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <LuX className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List — preventDefault keeps focus on search input while clicking options */}
          <div className="max-h-56 overflow-y-auto" onMouseDown={(e) => e.preventDefault()}>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <LuBoxes className="h-7 w-7 text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-500">No products found</p>
                <p className="text-xs text-slate-400 mt-0.5">Try a different name or SKU</p>
              </div>
            ) : (
              <div className="p-1">
                {filtered.map(opt => {
                  const isSelected = value === opt.id;
                  const isLow = opt.availableQty > 0 && opt.availableQty <= 5;
                  const isOut = opt.availableQty === 0;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => { onChange(opt.id); setOpen(false); setSearch(''); }}
                      className={`
                        w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-colors
                        ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}
                      `}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOut ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-green-400'}`} />
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-700' : 'text-slate-900'}`}>
                            {opt.name}
                          </p>
                          <p className="text-[11px] font-mono text-slate-400">{opt.sku}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`
                          text-[11px] font-bold px-2 py-0.5 rounded-full
                          ${isOut ? 'bg-red-100 text-red-700' : isLow ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}
                        `}>
                          {opt.availableQty} avail
                        </span>
                        {isSelected && <LuCheck className="h-4 w-4 text-indigo-600" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer count */}
          {filtered.length > 0 && (
            <div className="px-3 py-2 border-t border-slate-100 bg-slate-50">
              <p className="text-[11px] text-slate-400">
                {filtered.length} product{filtered.length !== 1 ? 's' : ''}{search ? ' matched' : ' available'}
              </p>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Location Select ──────────────────────────────────────────────────────────
function LocationSelect({
  value,
  onChange,
  options,
  placeholder,
  excludeId,
  error,
  label,
  icon: Icon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: any[];
  placeholder: string;
  excludeId?: string;
  error?: string;
  label: string;
  icon: React.ElementType;
}) {
  const filtered = excludeId ? options.filter(l => l.id !== excludeId) : options;
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`
            w-full h-10 pl-3 pr-8 rounded-lg border text-sm appearance-none bg-white transition-all outline-none
            ${error
              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
              : value
                ? 'border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-900 font-medium'
                : 'border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-slate-500'
            }
          `}
        >
          <option value="">{placeholder}</option>
          {filtered?.map((l: any) => (
            <option key={l.id} value={l.id}>{l.name} — {l.code}</option>
          ))}
        </select>
        <LuChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      </div>
      {error && (
        <p className="flex items-center gap-1 text-[11px] text-red-500">
          <LucideAlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StockTransfersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedDest, setSelectedDest] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<StockTransfer | null>(null);
  const [detailsTransfer, setDetailsTransfer] = useState<StockTransfer | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [shipConfirmId, setShipConfirmId] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [receiveTransfer, setReceiveTransfer] = useState<StockTransfer | null>(null);
  const [receiveConfirmOpen, setReceiveConfirmOpen] = useState(false);
  const [pendingReceiveValues, setPendingReceiveValues] = useState<ReceiveFormValues | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: transfersRes, isLoading } = useQuery({
    queryKey: ['transfers', 'list', page, limit, searchTerm, selectedStatus, selectedSource, selectedDest],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>('/stock-transfers/get-all-paginated', {
        params: {
          page, limit,
          searchTerm: searchTerm || undefined,
          status: selectedStatus || undefined,
          sourceLocationId: selectedSource || undefined,
          destinationLocationId: selectedDest || undefined,
        }
      });
      const payload = r.data.data;
      if (Array.isArray(payload)) return { data: payload, meta: { page: 1, totalPages: 1, total: payload.length, limit } };
      return payload;
    }
  });

  const { data: locationsRes } = useQuery({
    queryKey: ['transfers', 'locations'],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any[]>>('/stocks/locations/get-all');
      return r.data.data;
    }
  });

  const { data: productsRes } = useQuery({
    queryKey: ['transfers', 'products'],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>('/products/get-all');
      const d = r.data.data;
      return Array.isArray(d) ? d : (d as any)?.data || [];
    }
  });

  const fetchById = async (id: string): Promise<StockTransfer> => {
    const r = await apiClient.get<ApiResponse<StockTransfer>>(`/stock-transfers/get/${id}`);
    return r.data.data as StockTransfer;
  };

  // ─── Mutations ───────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (p: TransferFormValues) => {
      const r = await apiClient.post<ApiResponse<any>>('/stock-transfers/create', p);
      return r.data;
    },
    onSuccess: () => {
      toast.success('Transfer created as DRAFT');
      setFormOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create transfer'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: TransferFormValues }) => {
      const r = await apiClient.patch<ApiResponse<any>>(`/stock-transfers/update/${id}`, payload);
      return r.data;
    },
    onSuccess: () => {
      toast.success('Transfer updated');
      setFormOpen(false);
      setEditingTransfer(null);
      reset();
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update transfer'),
  });

  const shipMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.patch<ApiResponse<any>>(`/stock-transfers/ship/${id}`);
      return r.data;
    },
    onSuccess: () => {
      toast.success('Transfer is now IN TRANSIT — source stock deducted');
      setShipConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Failed to ship transfer');
      setShipConfirmId(null);
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ReceiveFormValues }) => {
      const r = await apiClient.patch<ApiResponse<any>>(`/stock-transfers/receive/${id}`, payload);
      return r.data;
    },
    onSuccess: () => {
      toast.success('Transfer received — destination stock credited');
      setReceiveTransfer(null);
      setReceiveConfirmOpen(false);
      setPendingReceiveValues(null);
      receiveReset();
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to receive transfer'),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.patch<ApiResponse<any>>(`/stock-transfers/cancel/${id}`);
      return r.data;
    },
    onSuccess: () => {
      toast.success('Transfer cancelled — stock restored if applicable');
      setCancelConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Failed to cancel transfer');
      setCancelConfirmId(null);
    },
  });

  // ─── Create / Edit Form ──────────────────────────────────────────────────────
  const { register, control, handleSubmit, reset, setValue, formState: { errors } } = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema) as any,
    defaultValues: { sourceLocationId: '', destinationLocationId: '', notes: '', items: [{ productId: '', quantity: 1 }] }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchedSourceId = useWatch({ control, name: 'sourceLocationId' });
  const watchedDestId = useWatch({ control, name: 'destinationLocationId' });
  const watchedItems = useWatch({ control, name: 'items' });

  // ─── Source stocks query ─────────────────────────────────────────────────────
  const { data: sourceStocksRes } = useQuery({
    queryKey: ['transfers', 'source-stocks', watchedSourceId],
    queryFn: async () => {
      if (!watchedSourceId) return [];
      const r = await apiClient.get<ApiResponse<any>>('/stocks/get-all-paginated', {
        params: { locationId: watchedSourceId, limit: 200 }
      });
      const payload = r.data.data;
      return Array.isArray(payload) ? payload : (payload as any)?.data || [];
    },
    enabled: !!watchedSourceId,
  });

  const sourceProductOptions: ProductOption[] = useMemo(() => {
    if (!sourceStocksRes?.length) return [];
    return sourceStocksRes
      .filter((s: any) => s.quantity > 0)
      .map((s: any) => ({
        id: s.productId,
        name: s.product?.name ?? '—',
        sku: s.product?.sku ?? '—',
        availableQty: s.quantity - (s.reservedQuantity ?? 0),
      }));
  }, [sourceStocksRes]);

  const getAvailableQty = (productId: string) =>
    sourceProductOptions.find(p => p.id === productId)?.availableQty ?? 0;

  useEffect(() => {
    if (editingTransfer) {
      reset({
        sourceLocationId: editingTransfer.sourceLocationId,
        destinationLocationId: editingTransfer.destinationLocationId,
        notes: editingTransfer.notes || '',
        items: editingTransfer.items?.length
          ? editingTransfer.items.map(i => ({ productId: i.productId, quantity: i.quantity }))
          : [{ productId: '', quantity: 1 }],
      });
    } else {
      reset({ sourceLocationId: '', destinationLocationId: '', notes: '', items: [{ productId: '', quantity: 1 }] });
    }
  }, [editingTransfer, reset]);

  const onSubmit = (v: TransferFormValues) => {
    if (editingTransfer) {
      updateMutation.mutate({ id: editingTransfer.id, payload: v });
    } else {
      createMutation.mutate(v);
    }
  };

  // ─── Receive Form ────────────────────────────────────────────────────────────
  const {
    register: receiveRegister,
    control: receiveControl,
    handleSubmit: receiveHandleSubmit,
    reset: receiveReset,
    watch: receiveWatch,
  } = useForm<ReceiveFormValues>({ defaultValues: { notes: '', items: [] } });

  const { fields: receiveFields } = useFieldArray({ control: receiveControl, name: 'items' });

  useEffect(() => {
    if (receiveTransfer) {
      receiveReset({
        notes: '',
        items: (receiveTransfer.items || []).map(i => ({
          productId: i.productId,
          receivedQuantity: i.quantity,
        })),
      });
    }
  }, [receiveTransfer, receiveReset]);

  const handleEditClick = async (tr: StockTransfer) => {
    setEditLoading(true);
    try {
      const full = await fetchById(tr.id);
      setEditingTransfer({ ...full, items: full.items || [] });
      setFormOpen(true);
    } catch {
      setEditingTransfer({ ...tr, items: tr.items || [] });
      setFormOpen(true);
    } finally {
      setEditLoading(false);
    }
  };

  const handleViewClick = async (tr: StockTransfer) => {
    setDetailsLoading(true);
    try {
      const full = await fetchById(tr.id);
      setDetailsTransfer({ ...full, items: full.items || [] });
    } catch {
      setDetailsTransfer({ ...tr, items: tr.items || [] });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleReceiveClick = async (tr: StockTransfer) => {
    try {
      const full = await fetchById(tr.id);
      setReceiveTransfer({ ...full, items: full.items || [] });
    } catch {
      setReceiveTransfer({ ...tr, items: tr.items || [] });
    }
  };

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    IN_TRANSIT: 'bg-indigo-100 text-indigo-700',
    RECEIVED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  const itemsList: StockTransfer[] = transfersRes?.data || [];
  const meta = transfersRes?.meta || { page: 1, totalPages: 1, total: 0, limit };

  // ─── Computed totals for form ────────────────────────────────────────────────
  const totalTransferUnits = (watchedItems || []).reduce((s, item) => s + (Number(item.quantity) || 0), 0);
  const allItemsValid = (watchedItems || []).every(item => {
    if (!item.productId) return false;
    const avail = getAvailableQty(item.productId);
    return item.quantity >= 1 && item.quantity <= avail;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Stock Transfers</h1>
          <p className="text-xs text-slate-500 mt-0.5">Move inventory between locations. DRAFT → IN TRANSIT → RECEIVED.</p>
        </div>
        <Button
          onClick={() => { setEditingTransfer(null); setFormOpen(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 self-start md:self-auto"
        >
          <LuPlus className="h-4 w-4" /> New Transfer
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <LuSearch className="h-4 w-4" />
            </span>
            <input type="text" placeholder="Search transfer number..."
              value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              className="pl-9 w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border" />
          </div>
          <select value={selectedStatus} onChange={e => { setSelectedStatus(e.target.value); setPage(1); }}
            className="w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3">
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="RECEIVED">Received</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select value={selectedSource} onChange={e => { setSelectedSource(e.target.value); setPage(1); }}
            className="w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3">
            <option value="">All Sources</option>
            {locationsRes?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={selectedDest} onChange={e => { setSelectedDest(e.target.value); setPage(1); }}
            className="w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3">
            <option value="">All Destinations</option>
            {locationsRes?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card className="border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center"><Loader /></div>
        ) : itemsList.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-sm font-medium">No stock transfers found.</p>
            <p className="text-xs text-slate-400 mt-1">Create a transfer to move inventory between locations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase">
                  <th className="p-4">Transfer #</th>
                  <th className="p-4">Source</th>
                  <th className="p-4"></th>
                  <th className="p-4">Destination</th>
                  <th className="p-4 hidden sm:table-cell">Created</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 w-12">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {itemsList.map(tr => (
                  <tr key={tr.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{tr.transferNumber}</td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">{tr.sourceLocation?.name}</div>
                      <div className="text-[10px] text-slate-400">{tr.sourceLocation?.code}</div>
                    </td>
                    <td className="p-4 text-slate-300"><LuArrowRight className="h-4 w-4" /></td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">{tr.destinationLocation?.name}</div>
                      <div className="text-[10px] text-slate-400">{tr.destinationLocation?.code}</div>
                    </td>
                    <td className="p-4 text-slate-500 hidden sm:table-cell">{new Date(tr.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-center">
                      <Badge className={`font-semibold py-0.5 px-2 text-[10px] uppercase rounded-full border-0 ${statusColors[tr.status]}`}>
                        {tr.status === 'IN_TRANSIT' ? 'In Transit' : tr.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-500">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-100 shadow-lg">
                          {/* View Details — always visible */}
                          <DropdownMenuItem
                            onClick={() => handleViewClick(tr)}
                            className="flex items-center gap-2 text-slate-600 cursor-pointer"
                          >
                            <LuEye className="h-3.5 w-3.5" />
                            View Details
                          </DropdownMenuItem>

                          {/* DRAFT actions */}
                          {tr.status === 'DRAFT' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleEditClick(tr)}
                                disabled={editLoading}
                                className="flex items-center gap-2 text-indigo-600 focus:text-indigo-700 focus:bg-indigo-50 cursor-pointer"
                              >
                                <LuRefreshCw className={`h-3.5 w-3.5 ${editLoading ? 'animate-spin' : ''}`} />
                                {editLoading ? 'Loading...' : 'Edit Transfer'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setShipConfirmId(tr.id)}
                                className="flex items-center gap-2 text-blue-600 focus:text-blue-700 focus:bg-blue-50 cursor-pointer"
                              >
                                <LuTruck className="h-3.5 w-3.5" />
                                Ship
                              </DropdownMenuItem>
                            </>
                          )}

                          {/* IN_TRANSIT actions */}
                          {tr.status === 'IN_TRANSIT' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleReceiveClick(tr)}
                                className="flex items-center gap-2 text-green-600 focus:text-green-700 focus:bg-green-50 cursor-pointer"
                              >
                                <LuPackage className="h-3.5 w-3.5" />
                                Receive
                              </DropdownMenuItem>
                            </>
                          )}

                          {/* Cancel — DRAFT or IN_TRANSIT */}
                          {(tr.status === 'DRAFT' || tr.status === 'IN_TRANSIT') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setCancelConfirmId(tr.id)}
                                className="flex items-center gap-2 text-red-500 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                              >
                                <LuX className="h-3.5 w-3.5" />
                                Cancel Transfer
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
                  onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
                />
              </div>
          </div>
        )}
      </Card>

      {/* ─── Create / Edit Dialog ─────────────────────────────────────────────── */}
      {/*
        modal={false} is the actual fix for the ProductCombobox search input losing focus.
        The dropdown is portaled to document.body (to escape this dialog's overflow-y-auto),
        which means it lives OUTSIDE the Dialog's DOM subtree. With modal (the default),
        Radix activates a focus trap that watches every focusin on the page and yanks focus
        back inside the dialog whenever it detects focus moving to something it doesn't own —
        which is exactly what happens the instant you click/focus the portaled search box.
        Setting modal={false} disables that trap for this dialog only. Esc-to-close and
        click-outside-to-close still work fine; you just lose the page-scroll-lock / full
        focus-trap side effects, which don't matter here.
      */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => { if (!o) { setFormOpen(false); setEditingTransfer(null); reset(); } }}
        modal={false}
      >
        <DialogContent className="w-full max-w-[calc(100%-1rem)] sm:max-w-2xl lg:max-w-3xl max-h-[95dvh] sm:max-h-[92vh] overflow-y-auto p-0 rounded-xl sm:rounded-2xl">
          {/* Hidden title for a11y compliance */}
          <DialogTitle className="sr-only">
            {editingTransfer ? `Edit Transfer — ${editingTransfer.transferNumber}` : 'New Stock Transfer'}
          </DialogTitle>
          
          {/* Dialog Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate pr-6">
                  {editingTransfer ? `Edit — ${editingTransfer.transferNumber}` : 'New Stock Transfer'}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  {editingTransfer
                    ? 'Only DRAFT transfers can be edited.'
                    : 'Fill in the route and products to create a draft transfer.'}
                </p>
              </div>
              {/* Step indicator — hidden on mobile */}
              {/* <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                {['Route', 'Products', 'Notes'].map((step, i) => (
                  <React.Fragment key={step}>
                    <div className="flex items-center gap-1">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {i + 1}
                      </div>
                      <span className={`text-[11px] ${i === 0 ? 'text-indigo-700 font-semibold' : 'text-slate-400'}`}>{step}</span>
                    </div>
                    {i < 2 && <div className="w-4 h-px bg-slate-200" />}
                  </React.Fragment>
                ))}
              </div> */}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="px-4 sm:px-6 pb-4 sm:pb-6 pt-4 sm:pt-5 space-y-5 sm:space-y-6">

            {/* ── Section 1: Route ─────────────────────────────────────────── */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <LuMapPin className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">Transfer Route</h3>
              </div>

              {/* Location selectors — stacked on mobile, side-by-side on sm+ */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-end gap-3">
                <LocationSelect
                  label="Source Location"
                  icon={LuWarehouse}
                  value={watchedSourceId ?? ''}
                  onChange={v => setValue('sourceLocationId', v, { shouldValidate: true })}
                  options={locationsRes || []}
                  placeholder="Select source..."
                  error={errors.sourceLocationId?.message}
                />

                {/* Arrow — horizontal on sm+, vertical on mobile */}
                <div className="hidden sm:flex flex-col items-center pb-2.5">
                  <div className="flex items-center gap-1">
                    <div className="w-8 h-px bg-slate-300" />
                    <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                      <LuArrowRight className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <div className="w-8 h-px bg-slate-300" />
                  </div>
                </div>
                <div className="flex sm:hidden justify-center -my-1">
                  <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <LuArrowRight className="h-3.5 w-3.5 text-slate-500 rotate-90" />
                  </div>
                </div>

                <LocationSelect
                  label="Destination Location"
                  icon={LuMapPin}
                  value={watchedDestId ?? ''}
                  onChange={v => setValue('destinationLocationId', v, { shouldValidate: true })}
                  options={locationsRes || []}
                  placeholder="Select destination..."
                  excludeId={watchedSourceId}
                  error={errors.destinationLocationId?.message}
                />
              </div>

              {/* Source stock summary */}
              {watchedSourceId && (
                <div className={`rounded-xl border p-3 sm:p-3.5 transition-all ${sourceProductOptions.length === 0 ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50 border-indigo-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <LuWarehouse className={`h-4 w-4 shrink-0 ${sourceProductOptions.length === 0 ? 'text-amber-500' : 'text-indigo-600'}`} />
                    <p className={`text-xs font-semibold truncate ${sourceProductOptions.length === 0 ? 'text-amber-800' : 'text-indigo-800'}`}>
                      Stock at {locationsRes?.find((l: any) => l.id === watchedSourceId)?.name}
                    </p>
                    <span className={`ml-auto shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${sourceProductOptions.length === 0 ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {sourceProductOptions.length} SKU{sourceProductOptions.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {sourceProductOptions.length === 0 ? (
                    <p className="text-xs text-amber-700 flex items-center gap-1.5">
                      <LucideAlertCircle className="h-3.5 w-3.5 shrink-0" />
                      No available stock at this location. Select a different source.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {sourceProductOptions.slice(0, 8).map(p => (
                        <span key={p.id} className="inline-flex items-center gap-1 text-[11px] bg-white border border-indigo-200 rounded-full px-2 py-0.5 text-indigo-700 font-medium">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.availableQty <= 5 ? 'bg-amber-400' : 'bg-green-400'}`} />
                          <span className="max-w-[72px] sm:max-w-none truncate">{p.name}</span>: <strong>{p.availableQty}</strong>
                        </span>
                      ))}
                      {sourceProductOptions.length > 8 && (
                        <span className="text-[11px] text-indigo-500 font-medium px-1">+{sourceProductOptions.length - 8} more</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-slate-200" />

            {/* ── Section 2: Products ──────────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <LuBoxes className="h-3.5 w-3.5 text-indigo-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 truncate">Products to Transfer</h3>
                  {fields.length > 0 && (
                    <span className="text-[11px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full shrink-0">
                      {fields.length}
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!watchedSourceId || sourceProductOptions.length === 0}
                  onClick={() => append({ productId: '', quantity: 1 })}
                  className="text-xs h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-medium shrink-0"
                >
                  <LuPlus className="h-3.5 w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Add Product</span>
                </Button>
              </div>

              {/* Empty state — no source selected */}
              {!watchedSourceId && (
                <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
                  <LuWarehouse className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-500">Select a source location first</p>
                  <p className="text-xs text-slate-400 mt-1">Products available at that location will appear here</p>
                </div>
              )}

              {/* Products table */}
              {watchedSourceId && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_52px_80px_36px] sm:grid-cols-[1fr_72px_100px_36px] bg-slate-50 border-b border-slate-200">
                    <div className="px-2 sm:px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Product</div>
                    <div className="px-1 sm:px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-center">Avail.</div>
                    <div className="px-1 sm:px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-center">Qty</div>
                    <div />
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-slate-100">
                    {fields.map((field, idx) => {
                      const pid = watchedItems?.[idx]?.productId ?? '';
                      const availQty = getAvailableQty(pid);
                      const qty = watchedItems?.[idx]?.quantity ?? 1;
                      const overLimit = pid && qty > availQty;
                      const isLastRow = fields.length === 1;

                      return (
                        <div
                          key={field.id}
                          className={`grid grid-cols-[1fr_52px_80px_36px] sm:grid-cols-[1fr_72px_100px_36px] items-center hover:bg-slate-50/80 transition-colors ${overLimit ? 'bg-red-50/30' : ''}`}
                        >
                          {/* Product combobox */}
                          <div className="px-2 sm:px-3 py-2 border-r border-slate-100">
                            <ProductCombobox
                              value={pid}
                              onChange={val => setValue(`items.${idx}.productId`, val, { shouldValidate: true })}
                              options={sourceProductOptions}
                              disabled={!watchedSourceId}
                              hasError={!!errors.items?.[idx]?.productId}
                              placeholder="Select..."
                            />
                            {errors.items?.[idx]?.productId && (
                              <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                                <LucideAlertCircle className="h-3 w-3 shrink-0" />
                                {errors.items[idx]?.productId?.message}
                              </p>
                            )}
                          </div>

                          {/* Available qty */}
                          <div className="px-1 sm:px-3 py-2 text-center border-r border-slate-100">
                            {pid ? (
                              <span className={`text-sm font-bold ${availQty === 0 ? 'text-red-600' : availQty <= 5 ? 'text-amber-600' : 'text-green-700'}`}>
                                {availQty}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-sm">—</span>
                            )}
                          </div>

                          {/* Quantity input */}
                          <div className="px-1 sm:px-3 py-2 border-r border-slate-100">
                            <input
                              type="number"
                              min={1}
                              max={availQty || undefined}
                              {...register(`items.${idx}.quantity` as const, {
                                valueAsNumber: true,
                                validate: v => !pid || v <= availQty || `Max ${availQty}`
                              })}
                              className={`
                                w-full h-9 text-center font-semibold text-sm rounded-lg border outline-none transition-all
                                ${overLimit
                                  ? 'border-red-300 bg-red-50 text-red-700 focus:ring-2 focus:ring-red-100'
                                  : 'border-slate-200 bg-white text-slate-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'
                                }
                              `}
                            />
                            {((errors.items?.[idx]?.quantity as any)?.message || overLimit) && (
                              <p className="text-[10px] text-red-500 mt-0.5 text-center">
                                {(errors.items?.[idx]?.quantity as any)?.message || `Max ${availQty}`}
                              </p>
                            )}
                          </div>

                          {/* Remove row */}
                          <div className="flex items-center justify-center py-2">
                            <button
                              type="button"
                              onClick={() => !isLastRow && remove(idx)}
                              disabled={isLastRow}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isLastRow ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                            >
                              <LuTrash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Table footer with totals */}
                  {fields.length > 0 && totalTransferUnits > 0 && (
                    <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-slate-50 border-t border-slate-200">
                      <span className="text-[11px] text-slate-500">{fields.length} product{fields.length !== 1 ? 's' : ''}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500">Total units:</span>
                        <span className="text-xs font-bold text-indigo-700">{totalTransferUnits}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {errors.items && !Array.isArray(errors.items) && (
                <p className="text-xs text-red-500 flex items-center gap-1.5">
                  <LucideAlertCircle className="h-3.5 w-3.5" /> {errors.items.message}
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-slate-200" />

            {/* ── Section 3: Notes ─────────────────────────────────────────── */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                Notes <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                {...register('notes')}
                placeholder="Reason for transfer, special handling instructions..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 resize-none text-slate-700 placeholder:text-slate-400 transition-all"
              />
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
              {/* <Button
                type="button"
                variant="ghost"
                onClick={() => { setFormOpen(false); setEditingTransfer(null); reset(); }}
                className="text-slate-500 hover:text-slate-700 text-sm"
              >
                Discard
              </Button> */}
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setFormOpen(false); setEditingTransfer(null); reset(); }}
                  className="text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 sm:px-5 rounded-xl"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <LuRefreshCw className="animate-spin h-4 w-4 mr-2" />
                  )}
                  {editingTransfer ? 'Update Transfer' : 'Save as Draft'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Receive Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={!!receiveTransfer} onOpenChange={o => { if (!o) { setReceiveTransfer(null); receiveReset(); } }}>
        {receiveTransfer && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Hidden title for a11y compliance */}
            <DialogTitle className="sr-only">
              Receive Transfer — {receiveTransfer.transferNumber}
            </DialogTitle>
            
            <DialogHeader>
              <h2 className="text-lg font-bold text-slate-800">
                Receive Transfer — {receiveTransfer.transferNumber}
              </h2>
            </DialogHeader>

            <div className="flex items-center gap-2 bg-slate-50 border rounded-xl p-3 text-xs text-slate-600">
              <span className="font-bold text-slate-900">{receiveTransfer.sourceLocation?.name}</span>
              <LuArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="font-bold text-slate-900">{receiveTransfer.destinationLocation?.name}</span>
              <span className="ml-auto text-slate-400">Partial receive supported — unreceived units auto-return to source</span>
            </div>

            <form onSubmit={receiveHandleSubmit(v => {
              const hasReturns = receiveTransfer.items.some((item, idx) => {
                const received = (v.items[idx]?.receivedQuantity ?? 0);
                return (item.quantity - received) > 0;
              });
              if (hasReturns) {
                setPendingReceiveValues(v);
                setReceiveConfirmOpen(true);
              } else {
                receiveMutation.mutate({ id: receiveTransfer.id, payload: v });
              }
            })} className="space-y-4">

              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3 text-center">Shipped</th>
                      <th className="p-3 text-center w-28">Received *</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {receiveFields.map((field, idx) => {
                      const item = receiveTransfer.items[idx];
                      const watchedReceiveItems = receiveWatch('items');
                      const received = Number(watchedReceiveItems?.[idx]?.receivedQuantity ?? item?.quantity ?? 0);
                      const returned = (item?.quantity ?? 0) - received;
                      const isFull = received === item?.quantity;
                      const isPartial = received > 0 && received < (item?.quantity ?? 0);
                      const isNone = received === 0;

                      return (
                        <tr key={field.id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <p className="font-semibold text-slate-900">{item?.product?.name}</p>
                            <p className="text-[10px] text-slate-400">{item?.product?.sku}</p>
                            <input type="hidden" {...receiveRegister(`items.${idx}.productId` as const)} />
                          </td>
                          <td className="p-3 text-center font-bold text-slate-700">{item?.quantity}</td>
                          <td className="p-3">
                            <input
                              type="number" min={0} max={item?.quantity}
                              {...receiveRegister(`items.${idx}.receivedQuantity` as const, { valueAsNumber: true })}
                              className="w-full bg-white border border-slate-300 rounded-lg text-center text-sm h-9 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-green-700"
                            />
                            <div className="mt-1 space-y-0.5 text-[10px]">
                              <p className="text-green-600 font-medium">→ {received} to {receiveTransfer.destinationLocation?.name}</p>
                              {returned > 0 && (
                                <p className="text-amber-600 font-medium">↩ {returned} back to {receiveTransfer.sourceLocation?.name}</p>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {isFull && <Badge className="bg-green-100 text-green-800 border-0 text-[10px] font-bold rounded-full px-2">Full</Badge>}
                            {isPartial && <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px] font-bold rounded-full px-2">Partial</Badge>}
                            {isNone && <Badge className="bg-red-100 text-red-800 border-0 text-[10px] font-bold rounded-full px-2">Not Received</Badge>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {(() => {
                const watchedReceiveItems = receiveWatch('items');
                const totalShipped = receiveTransfer.items.reduce((s, i) => s + (i.quantity ?? 0), 0);
                const totalReceived = receiveTransfer.items.reduce((s, i, idx) => s + Number(watchedReceiveItems?.[idx]?.receivedQuantity ?? i.quantity ?? 0), 0);
                const totalReturned = totalShipped - totalReceived;
                return (
                  <div className="bg-slate-50 border rounded-xl p-4 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Total transferred:</span>
                      <span className="font-semibold text-slate-900">{totalShipped} units</span>
                    </div>
                    <div className="flex justify-between text-green-700">
                      <span>Going to {receiveTransfer.destinationLocation?.name}:</span>
                      <span className="font-bold">+{totalReceived} units</span>
                    </div>
                    {totalReturned > 0 && (
                      <div className="flex justify-between text-amber-700">
                        <span>Returning to {receiveTransfer.sourceLocation?.name}:</span>
                        <span className="font-bold">+{totalReturned} units</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Notes (Optional)</label>
                <textarea rows={2} {...receiveRegister('notes')} placeholder="Discrepancies, damage, remarks..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setReceiveTransfer(null); receiveReset(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={receiveMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                  {receiveMutation.isPending && <LuRefreshCw className="animate-spin h-4 w-4 mr-2" />}
                  Confirm Received
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>

      {/* ─── Partial Return Confirm Modal ────────────────────────────────────── */}
      {receiveTransfer && (
        <DeleteModal
          open={receiveConfirmOpen}
          onOpenChange={o => { if (!o) setReceiveConfirmOpen(false); }}
          title="Partial Receive — Confirm Return"
          description={(() => {
            if (!pendingReceiveValues) return '';
            const returned = receiveTransfer.items.reduce((s, item, idx) => {
              const received = Number(pendingReceiveValues.items[idx]?.receivedQuantity ?? 0);
              return s + (item.quantity - received);
            }, 0);
            return `${returned} unit(s) will be automatically returned to ${receiveTransfer.sourceLocation?.name}. The rest will be credited to ${receiveTransfer.destinationLocation?.name}. Proceed?`;
          })()}
          loading={receiveMutation.isPending}
          onConfirm={() => {
            if (pendingReceiveValues && receiveTransfer) {
              receiveMutation.mutate({ id: receiveTransfer.id, payload: pendingReceiveValues });
              setReceiveConfirmOpen(false);
            }
          }}
          confirmLabel="Yes, Confirm Receive"
          cancelLabel="Go Back"
        />
      )}

      {/* ─── View Details Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!detailsTransfer} onOpenChange={o => { if (!o) setDetailsTransfer(null); }}>
        {detailsTransfer && (
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between border-b pb-3">
                <span className="text-lg font-bold text-slate-800">{detailsTransfer.transferNumber}</span>
                <Badge className={`font-semibold text-[10px] uppercase rounded-full border-0 ${statusColors[detailsTransfer.status]}`}>
                  {detailsTransfer.status === 'IN_TRANSIT' ? 'In Transit' : detailsTransfer.status}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-3">
              <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border">
                <div>
                  <p className="text-slate-400 font-medium">Source</p>
                  <p className="font-bold text-slate-900 mt-0.5">{detailsTransfer.sourceLocation?.name}</p>
                  <p className="text-slate-400">{detailsTransfer.sourceLocation?.code}</p>
                </div>
                <div className="flex items-center justify-center">
                  <LuArrowRight className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Destination</p>
                  <p className="font-bold text-slate-900 mt-0.5">{detailsTransfer.destinationLocation?.name}</p>
                  <p className="text-slate-400">{detailsTransfer.destinationLocation?.code}</p>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3 text-center">Shipped Qty</th>
                      <th className="p-3 text-center">Received Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {(detailsTransfer.items || []).map(item => (
                      <tr key={item.id}>
                        <td className="p-3 font-semibold text-slate-900">{item.product?.name}</td>
                        <td className="p-3 font-mono text-slate-500">{item.product?.sku}</td>
                        <td className="p-3 text-center font-bold">{item.quantity}</td>
                        <td className="p-3 text-center font-bold text-green-700">
                          {item.receivedQuantity ?? (detailsTransfer.status === 'RECEIVED' ? item.quantity : '—')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {detailsTransfer.notes && (
                <div className="bg-slate-50 p-3 rounded-xl border text-xs">
                  <p className="font-semibold text-slate-500 mb-1">Notes</p>
                  <p className="text-slate-700">{detailsTransfer.notes}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsTransfer(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ─── Ship Confirm ────────────────────────────────────────────────────── */}
      <DeleteModal
        open={!!shipConfirmId}
        onOpenChange={o => { if (!o) setShipConfirmId(null); }}
        title="Mark as In Transit"
        description="This will ship the transfer and deduct stock from the source location immediately. Make sure source has sufficient stock."
        loading={shipMutation.isPending}
        onConfirm={() => { if (shipConfirmId) shipMutation.mutate(shipConfirmId); }}
        confirmLabel="Ship Now"
        cancelLabel="Go Back"
      />

      {/* ─── Cancel Confirm ──────────────────────────────────────────────────── */}
      <DeleteModal
        open={!!cancelConfirmId}
        onOpenChange={o => { if (!o) setCancelConfirmId(null); }}
        title="Cancel Transfer"
        description="Cancelling an IN TRANSIT transfer will restore the source stock. This cannot be undone."
        loading={cancelMutation.isPending}
        onConfirm={() => { if (cancelConfirmId) cancelMutation.mutate(cancelConfirmId); }}
        confirmLabel="Cancel Transfer"
        cancelLabel="Go Back"
      />
    </div>
  );
}