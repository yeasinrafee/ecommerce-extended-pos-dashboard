'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/auth';
import {
  LuSearch, LuPlus, LuTrash, LuEye, LuRefreshCw,
  LuPackageOpen, LuCircleCheck, LuMapPin, LuBoxes,
  LuChevronDown, LuCheck, LuX,
} from 'react-icons/lu';
import { toast } from 'react-hot-toast';
import Loader from '@/components/Common/Loader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { PaginationControl } from '@/components/Common/Pagination';
import DeleteModal from '@/components/Common/DeleteModal';
import { LucideAlertCircle, MoreHorizontal } from 'lucide-react';

// ─── Zod Schema ───────────────────────────────────────────────────────────────
const grnItemSchema = zod.object({
  productId: zod.string().min(1, 'Product is required'),
  quantityOrdered: zod.number().min(0).default(0),
  quantityReceived: zod.number().min(1, 'Received qty must be ≥ 1'),
  quantityAccepted: zod.number().min(0),
  quantityRejected: zod.number().min(0).default(0),
  unitPrice: zod.number().min(0),
  batchNumber: zod.string().optional(),
  expiryDate: zod.string().optional(),
});

const grnFormSchema = zod.object({
  purchaseOrderId: zod.string().optional(),
  supplierId: zod.coerce.number().min(1, 'Supplier is required'),
  locationId: zod.string().min(1, 'Location is required'),
  receiveDate: zod.string().min(1, 'Receive date is required'),
  billNumber: zod.string().optional(),
  billAmount: zod.coerce.number().optional(),
  notes: zod.string().optional(),
  items: zod.array(grnItemSchema).min(1, 'At least one item is required'),
});

type GRNFormValues = zod.infer<typeof grnFormSchema>;

// ─── Interfaces ────────────────────────────────────────────────────────────────
interface GRNItem {
  id: string;
  productId: string;
  quantityOrdered: number;
  quantityReceived: number;
  quantityAccepted: number;
  quantityRejected: number;
  unitPrice: number;
  totalPrice: number;
  batchNumber?: string;
  expiryDate?: string;
  product: { name: string; sku: string };
}

interface GoodsReceive {
  id: string;
  grnNumber: string;
  purchaseOrderId?: string;
  purchaseOrder?: { poNumber: string };
  supplierId: number;
  supplier: { name: string };
  locationId: string;
  location: { name: string };
  receiveDate: string;
  status: 'DRAFT' | 'RECEIVED' | 'CANCELLED';
  billNumber?: string;
  billAmount?: number;
  notes?: string;
  createdAt: string;
  items: GRNItem[];
}

// LocalDraft: persisted to localStorage so it survives navigation
interface LocalDraft {
  id: string;
  values: GRNFormValues;
  supplierName: string;
  locationName: string;
  createdAt: string;
}

// ─── Product Option type (simplified for GRN) ─────────────────────────────────
interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

const DRAFT_STORAGE_KEY = 'grn_local_drafts';

function loadDrafts(): LocalDraft[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveDrafts(drafts: LocalDraft[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}

const DEFAULT_ITEM = {
  productId: '', quantityOrdered: 0, quantityReceived: 1,
  quantityAccepted: 1, quantityRejected: 0, unitPrice: 0,
  batchNumber: '', expiryDate: '',
};

// ─── Status helpers ────────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-800',
  RECEIVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

// ─── ProductCombobox (portal-based, with search + clear, flip-up logic) ────────
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
      if (ref.current?.contains(target)) return;
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

  const DROPDOWN_HEIGHT = 320;

  const handleOpen = () => {
    if (!disabled) {
      if (!open && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const openUpward = spaceBelow < DROPDOWN_HEIGHT && spaceAbove > spaceBelow;
        setDropdownStyle(
          openUpward
            ? { position: 'fixed', bottom: window.innerHeight - rect.top + 4, left: rect.left, width: Math.max(rect.width, 300), zIndex: 9999 }
            : { position: 'fixed', top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 300), zIndex: 9999 }
        );
      }
      setOpen(o => !o);
      setSearch('');
    }
  };

  return (
    <div ref={ref} className="relative w-full">
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
            <LuChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </span>
        )}
      </div>

      {open && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden pointer-events-auto"
        >
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
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-700' : 'text-slate-900'}`}>
                          {opt.name}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400">{opt.sku}</p>
                      </div>
                      {isSelected && <LuCheck className="h-4 w-4 text-indigo-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

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

// ─── Page Component ────────────────────────────────────────────────────────────
export default function GRNPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [detailsGRN, setDetailsGRN] = useState<GoodsReceive | null>(null);
  const [detailsDraft, setDetailsDraft] = useState<LocalDraft | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // ── FIX #1: Initialize directly from localStorage — no save-on-every-change effect ──
  const [localDrafts, setLocalDrafts] = useState<LocalDraft[]>(() => loadDrafts());
  const [receiveConfirmDraft, setReceiveConfirmDraft] = useState<LocalDraft | null>(null);
  const [deleteDraftTarget, setDeleteDraftTarget] = useState<string | null>(null);

  // ─── Queries ──────────────────────────────────────────────────────────────────
  const { data: grnRes, isLoading: isLoadingGRNs } = useQuery({
    queryKey: ['grns', 'list', page, limit, searchTerm, selectedLocation, selectedSupplier],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>('/goods-receives/get-all-paginated', {
        params: { page, limit, searchTerm: searchTerm || undefined, locationId: selectedLocation || undefined, supplierId: selectedSupplier || undefined },
      });
      const payload = r.data.data;
      if (Array.isArray(payload)) return { data: payload, meta: { page: 1, totalPages: 1, total: payload.length, limit } };
      return payload;
    },
  });

  const { data: suppliersRes } = useQuery({
    queryKey: ['grns', 'suppliers'],
    queryFn: async () => (await apiClient.get<ApiResponse<any[]>>('/suppliers/get-all')).data.data,
  });

  const { data: locationsRes } = useQuery({
    queryKey: ['grns', 'locations'],
    queryFn: async () => (await apiClient.get<ApiResponse<any[]>>('/stocks/locations/get-all')).data.data,
  });

  const { data: productsRes } = useQuery({
    queryKey: ['grns', 'products'],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>('/products/get-all');
      const d = r.data.data;
      return Array.isArray(d) ? d : (d as any)?.data || [];
    },
  });

  const { data: approvedPOsRes } = useQuery({
    queryKey: ['grns', 'approved-pos'],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>('/purchase-orders/get-all-paginated', { params: { limit: 100, status: 'APPROVED' } });
      const payload = r.data.data;
      return Array.isArray(payload) ? payload : (payload as any)?.data || [];
    },
  });

  // Build ProductOption array for the combobox
  const productOptions: ProductOption[] = useMemo(() =>
    (productsRes || []).map((p: any) => ({ id: p.id, name: p.name, sku: p.sku || '' })),
    [productsRes],
  );

  // ─── Mutations ─────────────────────────────────────────────────────────────────
  const createGRNMutation = useMutation({
    mutationFn: async (payload: GRNFormValues) => {
      const r = await apiClient.post<ApiResponse<any>>('/goods-receives/create', payload);
      return r.data;
    },
    onSuccess: () => {
      toast.success('GRN created — stock levels updated');
      setLocalDrafts(prev => {
        const updated = prev.filter(d => d.id !== receiveConfirmDraft?.id);
        saveDrafts(updated);
        return updated;
      });
      setReceiveConfirmDraft(null);
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create GRN'),
  });

  // ─── Form ──────────────────────────────────────────────────────────────────────
  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<GRNFormValues>({
    resolver: zodResolver(grnFormSchema) as any,
    defaultValues: {
      purchaseOrderId: '', supplierId: 0, locationId: '',
      receiveDate: new Date().toISOString().substring(0, 10),
      billNumber: '', billAmount: 0, notes: '',
      items: [{ ...DEFAULT_ITEM }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');
  const watchedPOId = watch('purchaseOrderId');

  // Auto-fill from PO
  useEffect(() => {
    if (!watchedPOId) return;
    const po = approvedPOsRes?.find((p: any) => p.id === watchedPOId);
    if (!po) return;
    setValue('supplierId', po.supplierId);
    setValue('locationId', po.locationId);
    apiClient.get<ApiResponse<any>>(`/purchase-orders/get/${watchedPOId}`).then(res => {
      const details = res.data.data;
      if (details?.items?.length) {
        setValue('items', details.items.map((item: any) => ({
          productId: item.productId,
          quantityOrdered: item.quantity,
          quantityReceived: item.quantity - (item.receivedQuantity || 0),
          quantityAccepted: item.quantity - (item.receivedQuantity || 0),
          quantityRejected: 0,
          unitPrice: item.unitPrice,
          batchNumber: '', expiryDate: '',
        })));
      }
    });
  }, [watchedPOId, approvedPOsRes, setValue]);

  // ── FIX #4 helper + price auto-fill ──
  const handleProductSelect = (index: number, productId: string) => {
    setValue(`items.${index}.productId`, productId, { shouldValidate: true });
    const p = productsRes?.find((x: any) => x.id === productId);
    if (p) {
      // Auto-fill unit price from product base price
      setValue(`items.${index}.unitPrice`, p.basePrice || p.Baseprice || 0);
      // Auto-fill received / accepted quantities from product stock or defaultQuantity
      const defQty = p.stock ?? p.defaultQuantity ?? 1;
      setValue(`items.${index}.quantityReceived`, defQty);
      setValue(`items.${index}.quantityAccepted`, defQty);
      setValue(`items.${index}.quantityOrdered`, defQty);
    }
  };

  const subtotal = useMemo(() =>
    (watchedItems || []).reduce((s, i) => s + (i.quantityAccepted || 0) * (i.unitPrice || 0), 0),
    [watchedItems],
  );

  // ── FIX #1: Save explicitly only when modifying drafts ──
  const onSaveAsDraft = (values: GRNFormValues) => {
    const supplierName = suppliersRes?.find((s: any) => String(s.id) === String(values.supplierId))?.name || 'Unknown';
    const locationName = locationsRes?.find((l: any) => l.id === values.locationId)?.name || 'Unknown';
    const draft: LocalDraft = { id: crypto.randomUUID(), values, supplierName, locationName, createdAt: new Date().toISOString() };
    setLocalDrafts(prev => { const updated = [...prev, draft]; saveDrafts(updated); return updated; });
    toast.success('GRN saved as draft — click Receive to confirm');
    setFormOpen(false);
    reset();
  };

  const handleViewGRN = async (grn: GoodsReceive) => {
    setDetailsLoading(true);
    try {
      const r = await apiClient.get<ApiResponse<GoodsReceive>>(`/goods-receives/get/${grn.id}`);
      const full = r.data.data as GoodsReceive;
      setDetailsGRN({ ...full, items: full.items || [] });
    } catch { setDetailsGRN({ ...grn, items: grn.items || [] }); }
    finally { setDetailsLoading(false); }
  };

  const itemsList: GoodsReceive[] = grnRes?.data || [];
  const meta = grnRes?.meta || { page: 1, totalPages: 1, total: 0, limit };

  // ─── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Goods Receive Notes (GRN)</h1>
          <p className="text-xs text-slate-500 mt-0.5">Record incoming shipments, verify quantities, then confirm to update stock.</p>
        </div>
        <Button
          onClick={() => { reset(); setFormOpen(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 self-start md:self-auto"
        >
          <LuPlus className="h-4 w-4" /> New GRN
        </Button>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <Card className="p-4 border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <LuSearch className="h-4 w-4" />
            </span>
            <input type="text" placeholder="Search GRN number, bill..."
              value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              className="pl-9 w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border" />
          </div>
          <select value={selectedLocation} onChange={e => { setSelectedLocation(e.target.value); setPage(1); }}
            className="w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3">
            <option value="">All Locations</option>
            {locationsRes?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={selectedSupplier} onChange={e => { setSelectedSupplier(e.target.value); setPage(1); }}
            className="w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3">
            <option value="">All Suppliers</option>
            {suppliersRes?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </Card>

      {/* ── Unified Table (drafts on top, then received GRNs) ──────────────── */}
      <Card className="border-slate-100 shadow-sm overflow-hidden">
        {isLoadingGRNs && localDrafts.length === 0 ? (
          <div className="flex h-64 items-center justify-center"><Loader /></div>
        ) : localDrafts.length === 0 && itemsList.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-sm font-medium">No Goods Receive Notes found.</p>
            <p className="text-xs text-slate-400 mt-1">Create a GRN to check-in stock items.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase">
                  <th className="p-4">GRN / Ref</th>
                  <th className="p-4 hidden md:table-cell">Linked PO</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4 hidden sm:table-cell">Location</th>
                  <th className="p-4 hidden lg:table-cell">Receive Date</th>
                  <th className="p-4 hidden lg:table-cell">Bill</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">

                {/* ── Local draft rows (amber tinted) ── */}
                {localDrafts.map(draft => (
                  <tr key={draft.id} className="bg-amber-50/60 hover:bg-amber-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <LuPackageOpen className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        Local Draft
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{draft.values.items.length} item(s)</div>
                    </td>
                    <td className="p-4 hidden md:table-cell text-slate-400 text-xs">
                      {draft.values.purchaseOrderId ? approvedPOsRes?.find((p: any) => p.id === draft.values.purchaseOrderId)?.poNumber || '—' : 'Direct In'}
                    </td>
                    <td className="p-4 font-medium text-slate-900">{draft.supplierName}</td>
                    <td className="p-4 hidden sm:table-cell">{draft.locationName}</td>
                    <td className="p-4 hidden lg:table-cell text-slate-500">{new Date(draft.values.receiveDate).toLocaleDateString()}</td>
                    <td className="p-4 hidden lg:table-cell">
                      {draft.values.billNumber
                        ? <div><p className="font-semibold">{draft.values.billNumber}</p><p className="text-[10px] text-slate-400">${(draft.values.billAmount || 0).toFixed(2)}</p></div>
                        : <span className="text-slate-400 text-xs">No Bill</span>}
                    </td>
                    <td className="p-4 text-center">
                      <Badge className="font-semibold py-0.5 px-2 text-[10px] uppercase rounded-full border-0 bg-amber-100 text-amber-800">Draft</Badge>
                    </td>
                    <td className="p-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-500">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-100 shadow-lg">
                          <DropdownMenuItem onClick={() => setDetailsDraft(draft)} className="flex items-center gap-2 text-slate-600 cursor-pointer">
                            <LuEye className="h-3.5 w-3.5" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setReceiveConfirmDraft(draft)} className="flex items-center gap-2 text-green-600 focus:text-green-700 focus:bg-green-50 cursor-pointer">
                            <LuCircleCheck className="h-3.5 w-3.5" /> Receive &amp; Confirm
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleteDraftTarget(draft.id)} className="flex items-center gap-2 text-red-500 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                            <LuTrash className="h-3.5 w-3.5" /> Discard Draft
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}

                {/* ── Server GRN rows ── */}
                {isLoadingGRNs ? (
                  <tr><td colSpan={8} className="p-8 text-center"><Loader /></td></tr>
                ) : (
                  itemsList.map(grn => (
                    <tr key={grn.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-900">{grn.grnNumber}</td>
                      <td className="p-4 hidden md:table-cell text-slate-500">{grn.purchaseOrder?.poNumber || 'Direct In'}</td>
                      <td className="p-4 font-medium text-slate-900">{grn.supplier?.name}</td>
                      <td className="p-4 hidden sm:table-cell">{grn.location?.name}</td>
                      <td className="p-4 hidden lg:table-cell text-slate-500">{new Date(grn.receiveDate).toLocaleDateString()}</td>
                      <td className="p-4 hidden lg:table-cell">
                        {grn.billNumber
                          ? <div><p className="font-semibold">{grn.billNumber}</p><p className="text-[10px] text-slate-400">${grn.billAmount?.toFixed(2)}</p></div>
                          : <span className="text-slate-400 text-xs">No Bill</span>}
                      </td>
                      <td className="p-4 text-center">
                        <Badge className={`font-semibold py-0.5 px-2 text-[10px] uppercase rounded-full border-0 ${statusColors[grn.status] || 'bg-slate-100 text-slate-700'}`}>
                          {grn.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-500">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 rounded-xl border-slate-100 shadow-lg">
                            <DropdownMenuItem onClick={() => handleViewGRN(grn)} disabled={detailsLoading} className="flex items-center gap-2 text-slate-600 cursor-pointer">
                              {detailsLoading ? <LuRefreshCw className="h-3.5 w-3.5 animate-spin" /> : <LuEye className="h-3.5 w-3.5" />}
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
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

      {/* ── Create GRN Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={o => { if (!o) { setFormOpen(false); reset(); } }} modal={false}>
        <DialogContent className="w-full max-w-[calc(100%-1rem)] sm:max-w-3xl lg:max-w-5xl max-h-[95dvh] sm:max-h-[92vh] overflow-y-auto p-0 rounded-xl sm:rounded-2xl">
          <DialogTitle className="sr-only">New Goods Receive Note</DialogTitle>

          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">New Goods Receive Note</h2>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Save as draft to review, then Receive to move stock.</p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 shrink-0 text-[11px] text-slate-400">
                <LuPackageOpen className="h-4 w-4 text-indigo-500" />
                <span className="font-medium text-indigo-600">GRN</span>
              </div>
            </div>
          </div>

          <form className="px-4 sm:px-6 pb-4 sm:pb-6 pt-4 sm:pt-5 space-y-5 sm:space-y-6">

            {/* ── Section 1: Header fields ──────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <LuMapPin className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">Receipt Details</h3>
              </div>

              {/* ── FIX #2 Row 1: Link PO | Supplier | Location ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">Link Approved PO <span className="font-normal text-slate-400">(Optional)</span></label>
                  <select {...register('purchaseOrderId')} className="w-full h-10 bg-white border border-slate-200 text-slate-800 text-sm rounded-lg outline-none px-3 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all">
                    <option value="">No PO (Direct In)</option>
                    {approvedPOsRes?.map((po: any) => <option key={po.id} value={po.id}>{po.poNumber} — {po.supplier?.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">Supplier *</label>
                  <select {...register('supplierId')} disabled={!!watchedPOId}
                    className="w-full h-10 bg-white border border-slate-200 text-slate-800 text-sm rounded-lg outline-none px-3 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60 disabled:bg-slate-50 transition-all">
                    <option value={0}>Select Supplier</option>
                    {suppliersRes?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {errors.supplierId && <p className="text-red-500 text-[10px] flex items-center gap-1"><LucideAlertCircle className="h-3 w-3" />{errors.supplierId.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">Location *</label>
                  <select {...register('locationId')} disabled={!!watchedPOId}
                    className="w-full h-10 bg-white border border-slate-200 text-slate-800 text-sm rounded-lg outline-none px-3 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60 disabled:bg-slate-50 transition-all">
                    <option value="">Select Location</option>
                    {locationsRes?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                  {errors.locationId && <p className="text-red-500 text-[10px] flex items-center gap-1"><LucideAlertCircle className="h-3 w-3" />{errors.locationId.message}</p>}
                </div>
              </div>

              {/* ── FIX #2 Row 2: Receive Date | Bill Number | Bill Amount ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">Receive Date *</label>
                  <input type="date" {...register('receiveDate')}
                    className="w-full h-10 bg-white border border-slate-200 text-slate-800 text-sm rounded-lg outline-none px-3 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
                  {errors.receiveDate && <p className="text-red-500 text-[10px] flex items-center gap-1"><LucideAlertCircle className="h-3 w-3" />{errors.receiveDate.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">Bill / Invoice Number</label>
                  <input type="text" placeholder="e.g. INV-9871" {...register('billNumber')}
                    className="w-full h-10 bg-white border border-slate-200 text-slate-800 text-sm rounded-lg outline-none px-3 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">Bill Amount</label>
                  <input type="number" step="0.01" placeholder="0.00" {...register('billAmount', { valueAsNumber: true })}
                    className="w-full h-10 bg-white border border-slate-200 text-slate-800 text-sm rounded-lg outline-none px-3 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
                </div>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-200" />

            {/* ── Section 2: Items ───────────────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <LuBoxes className="h-3.5 w-3.5 text-indigo-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 truncate">Received Items</h3>
                  {fields.length > 0 && (
                    <span className="text-[11px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full shrink-0">{fields.length}</span>
                  )}
                </div>
                {!watchedPOId && (
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => append({ ...DEFAULT_ITEM })}
                    className="text-xs h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-medium shrink-0">
                    <LuPlus className="h-3.5 w-3.5 sm:mr-1" />
                    <span className="hidden sm:inline">Add Row</span>
                  </Button>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
                      <tr>
                        <th className="px-3 py-2.5 w-[26%]">Product *</th>
                        <th className="px-3 py-2.5 text-center w-[7%]">Ordered</th>
                        <th className="px-3 py-2.5 text-center w-[9%]">Received *</th>
                        <th className="px-3 py-2.5 text-center w-[9%]">Accepted</th>
                        <th className="px-3 py-2.5 text-center w-[9%]">Rejected</th>
                        <th className="px-3 py-2.5 text-center w-[10%]">Unit Price</th>
                        <th className="px-3 py-2.5 w-[12%]">Batch</th>
                        <th className="px-3 py-2.5 w-[12%]">Expiry</th>
                        <th className="px-3 py-2.5 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fields.map((field, index) => {
                        const hasProduct = !!watchedItems?.[index]?.productId;
                        const disabledCls = 'disabled:opacity-50 disabled:cursor-not-allowed';
                        return (
                          <tr key={field.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                            {/* ── FIX #3: ProductCombobox instead of <select> ── */}
                            <td className="px-3 py-2">
                              <ProductCombobox
                                value={watchedItems?.[index]?.productId || ''}
                                onChange={(id) => handleProductSelect(index, id)}
                                options={productOptions}
                                placeholder="Select product..."
                                hasError={!!errors.items?.[index]?.productId}
                              />
                              {errors.items?.[index]?.productId && (
                                <p className="text-red-500 text-[10px] mt-0.5 flex items-center gap-1">
                                  <LucideAlertCircle className="h-3 w-3" />
                                  {errors.items[index]?.productId?.message}
                                </p>
                              )}
                            </td>
                            {/* ── FIX #4: Disable until product selected ── */}
                            <td className="px-3 py-2 text-center">
                              <input type="number" min={0}
                                {...register(`items.${index}.quantityOrdered`, { valueAsNumber: true })}
                                disabled={!hasProduct}
                                className={`w-16 h-9 text-center bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all ${disabledCls}`} />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input type="number" min={1}
                                {...register(`items.${index}.quantityReceived`, { valueAsNumber: true })}
                                disabled={!hasProduct}
                                className={`w-16 h-9 text-center bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all ${disabledCls} ${errors.items?.[index]?.quantityReceived ? 'border-red-400' : ''}`} />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input type="number" min={0}
                                {...register(`items.${index}.quantityAccepted`, { valueAsNumber: true })}
                                disabled={!hasProduct}
                                className={`w-16 h-9 text-center bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all ${disabledCls}`} />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input type="number" min={0}
                                {...register(`items.${index}.quantityRejected`, { valueAsNumber: true })}
                                disabled={!hasProduct}
                                className={`w-16 h-9 text-center bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all ${disabledCls}`} />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input type="number" step="0.01" min={0}
                                {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                                disabled={!hasProduct}
                                className={`w-20 h-9 text-center bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all ${disabledCls}`} />
                            </td>
                            <td className="px-3 py-2">
                              <input type="text" placeholder="Batch #"
                                {...register(`items.${index}.batchNumber`)}
                                disabled={!hasProduct}
                                className={`w-full h-9 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg outline-none px-2 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all ${disabledCls}`} />
                            </td>
                            <td className="px-3 py-2">
                              <input type="date"
                                {...register(`items.${index}.expiryDate`)}
                                disabled={!hasProduct}
                                className={`w-full h-9 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg outline-none px-2 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all ${disabledCls}`} />
                            </td>
                            <td className="px-3 py-2 text-center">
                              {fields.length > 1 && !watchedPOId && (
                                <button type="button" onClick={() => remove(index)}
                                  className="h-7 w-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
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
              </div>

              {errors.items?.root && (
                <p className="text-red-500 text-xs flex items-center gap-1"><LucideAlertCircle className="h-3.5 w-3.5" />{errors.items.root.message}</p>
              )}
              {typeof errors.items === 'object' && 'message' in errors.items && (
                <p className="text-red-500 text-xs flex items-center gap-1"><LucideAlertCircle className="h-3.5 w-3.5" />{(errors.items as any).message}</p>
              )}
            </div>

            {/* ── Subtotal ───────────────────────────────────────────────────── */}
            <div className="flex justify-end">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 flex items-center gap-4 text-sm">
                <span className="text-slate-500 font-medium">Subtotal (accepted × price)</span>
                <span className="font-bold text-slate-900 text-base">${subtotal.toFixed(2)}</span>
              </div>
            </div>

            {/* ── Notes ─────────────────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">Notes <span className="font-normal text-slate-400">(Optional)</span></label>
              <textarea rows={2} placeholder="Any notes about this delivery..."
                {...register('notes')}
                className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg outline-none px-3 py-2.5 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none transition-all" />
            </div>

            {/* ── Form actions ──────────────────────────────────────────────── */}
            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => { setFormOpen(false); reset(); }}
                className="order-last sm:order-first text-xs h-9 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium">
                Cancel
              </Button>
              <Button type="button" onClick={handleSubmit(onSaveAsDraft)}
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs h-9 font-medium px-5 rounded-lg">
                Save as Draft
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── View Draft Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={!!detailsDraft} onOpenChange={o => { if (!o) setDetailsDraft(null); }}>
        <DialogContent className="w-full max-w-[calc(100%-1rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl sm:rounded-2xl p-0">
          <DialogTitle className="sr-only">Draft Details</DialogTitle>
          <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <LuPackageOpen className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Local Draft Preview</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Not yet received — use Receive &amp; Confirm to update stock.</p>
              </div>
            </div>
          </div>
          {detailsDraft && (
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                  <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">Supplier</p>
                  <p className="font-semibold text-slate-900">{detailsDraft.supplierName}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                  <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">Location</p>
                  <p className="font-semibold text-slate-900">{detailsDraft.locationName}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                  <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">Receive Date</p>
                  <p className="font-semibold text-slate-900">{new Date(detailsDraft.values.receiveDate).toLocaleDateString()}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                  <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">Bill</p>
                  <p className="font-semibold text-slate-900">{detailsDraft.values.billNumber || '—'} {detailsDraft.values.billAmount ? `($${Number(detailsDraft.values.billAmount).toFixed(2)})` : ''}</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[480px]">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
                      <tr>
                        <th className="px-3 py-2.5">Product</th>
                        <th className="px-3 py-2.5 text-center">Rcvd</th>
                        <th className="px-3 py-2.5 text-center">Acptd</th>
                        <th className="px-3 py-2.5 text-center">Rjctd</th>
                        <th className="px-3 py-2.5 text-center">Unit $</th>
                        <th className="px-3 py-2.5">Batch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailsDraft.values.items.map((item, i) => {
                        const product = productsRes?.find((p: any) => p.id === item.productId);
                        return (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-2">
                              <p className="font-medium text-slate-900 truncate max-w-[140px]">{product?.name || item.productId}</p>
                              <p className="text-[10px] font-mono text-slate-400">{product?.sku || ''}</p>
                            </td>
                            <td className="px-3 py-2 text-center text-slate-700">{item.quantityReceived}</td>
                            <td className="px-3 py-2 text-center text-slate-700">{item.quantityAccepted}</td>
                            <td className="px-3 py-2 text-center text-slate-700">{item.quantityRejected}</td>
                            <td className="px-3 py-2 text-center text-slate-700">${item.unitPrice?.toFixed(2)}</td>
                            <td className="px-3 py-2 text-slate-500">{item.batchNumber || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex justify-between items-center pt-1">
                <Button variant="outline" size="sm" onClick={() => setDetailsDraft(null)} className="text-xs h-8">Close</Button>
                <Button size="sm" onClick={() => { setReceiveConfirmDraft(detailsDraft); setDetailsDraft(null); }}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-4">
                  <LuCircleCheck className="h-3.5 w-3.5 mr-1.5" /> Receive &amp; Confirm
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── View Received GRN Dialog ───────────────────────────────────────────── */}
      <Dialog open={!!detailsGRN} onOpenChange={o => { if (!o) setDetailsGRN(null); }}>
        <DialogContent className="w-full max-w-[calc(100%-1rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl sm:rounded-2xl p-0">
          <DialogTitle className="sr-only">GRN Details</DialogTitle>
          <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <LuCircleCheck className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{detailsGRN?.grnNumber}</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Received GRN — stock has been updated.</p>
                </div>
              </div>
              {detailsGRN && (
                <Badge className={`font-semibold py-0.5 px-2 text-[10px] uppercase rounded-full border-0 ${statusColors[detailsGRN.status] || 'bg-slate-100 text-slate-700'}`}>
                  {detailsGRN.status}
                </Badge>
              )}
            </div>
          </div>
          {detailsGRN && (
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                  <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">Supplier</p>
                  <p className="font-semibold text-slate-900">{detailsGRN.supplier?.name}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                  <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">Location</p>
                  <p className="font-semibold text-slate-900">{detailsGRN.location?.name}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                  <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">Receive Date</p>
                  <p className="font-semibold text-slate-900">{new Date(detailsGRN.receiveDate).toLocaleDateString()}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                  <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">Bill</p>
                  <p className="font-semibold text-slate-900">{detailsGRN.billNumber || '—'} {detailsGRN.billAmount ? `($${detailsGRN.billAmount.toFixed(2)})` : ''}</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[480px]">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
                      <tr>
                        <th className="px-3 py-2.5">Product</th>
                        <th className="px-3 py-2.5 text-center">Rcvd</th>
                        <th className="px-3 py-2.5 text-center">Acptd</th>
                        <th className="px-3 py-2.5 text-center">Rjctd</th>
                        <th className="px-3 py-2.5 text-center">Unit $</th>
                        <th className="px-3 py-2.5 text-center">Total $</th>
                        <th className="px-3 py-2.5">Batch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(detailsGRN.items || []).map(item => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <p className="font-medium text-slate-900 truncate max-w-[140px]">{item.product?.name || '—'}</p>
                            <p className="text-[10px] font-mono text-slate-400">{item.product?.sku || ''}</p>
                          </td>
                          <td className="px-3 py-2 text-center text-slate-700">{item.quantityReceived}</td>
                          <td className="px-3 py-2 text-center text-slate-700">{item.quantityAccepted}</td>
                          <td className="px-3 py-2 text-center text-slate-700">{item.quantityRejected}</td>
                          <td className="px-3 py-2 text-center text-slate-700">${item.unitPrice?.toFixed(2)}</td>
                          <td className="px-3 py-2 text-center font-semibold text-slate-900">${item.totalPrice?.toFixed(2)}</td>
                          <td className="px-3 py-2 text-slate-500">{item.batchNumber || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <Button variant="outline" size="sm" onClick={() => setDetailsGRN(null)} className="text-xs h-8">Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Receive & Confirm Modal ───────────────────────────────────────────── */}
      <Dialog open={!!receiveConfirmDraft} onOpenChange={o => { if (!o) setReceiveConfirmDraft(null); }}>
        <DialogContent className="w-full max-w-[calc(100%-1rem)] sm:max-w-md rounded-xl sm:rounded-2xl p-0">
          <DialogTitle className="sr-only">Confirm Receive</DialogTitle>
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <LuCircleCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Receive & Confirm GRN</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">This will finalize the goods receipt and update stock levels.</p>
              </div>
            </div>
          </div>
          {receiveConfirmDraft && (
            <div className="px-5 py-4 space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs">
                <p className="font-semibold text-amber-900 mb-1 flex items-center gap-1.5">
                  <LuBoxes className="h-3.5 w-3.5" /> Confirm Receipt Details
                </p>
                <p className="text-amber-700 leading-relaxed">
                  You are about to receive <strong>{receiveConfirmDraft.values.items.length} item(s)</strong> from <strong>{receiveConfirmDraft.supplierName}</strong> into <strong>{receiveConfirmDraft.locationName}</strong>.
                </p>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button variant="outline" onClick={() => setReceiveConfirmDraft(null)} className="text-xs h-9 order-last sm:order-first">Cancel</Button>
                <Button
                  onClick={() => createGRNMutation.mutate(receiveConfirmDraft.values)}
                  disabled={createGRNMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs h-9 px-5">
                  {createGRNMutation.isPending ? (
                    <><LuRefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Receiving...</>
                  ) : (
                    <><LuCircleCheck className="h-3.5 w-3.5 mr-1.5" /> Confirm & Receive</>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Discard Draft Modal ───────────────────────────────────────────────── */}
      <DeleteModal
        open={!!deleteDraftTarget}
        onOpenChange={(o) => { if (!o) setDeleteDraftTarget(null); }}
        onConfirm={() => {
          if (!deleteDraftTarget) return;
          setLocalDrafts(prev => {
            const updated = prev.filter(d => d.id !== deleteDraftTarget);
            saveDrafts(updated);
            return updated;
          });
          toast.success('Draft discarded');
          setDeleteDraftTarget(null);
        }}
        title="Discard Draft"
        description="Are you sure you want to delete this draft GRN? This action cannot be undone."
        confirmLabel="Discard"
      />
    </div>
  );
}
