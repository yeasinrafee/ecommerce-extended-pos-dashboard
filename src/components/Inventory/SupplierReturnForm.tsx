'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/auth';
import {
  LuSearch, LuPlus, LuTrash2, LuRefreshCw, LuChevronDown, LuCheck, LuX,
  LuBoxes, LuMapPin, LuArrowLeft, LuClipboardList, LuUser, LuTruck,
} from 'react-icons/lu';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideAlertCircle } from 'lucide-react';

// ─── Schemas ──────────────────────────────────────────────────────────────────
const returnItemSchema = zod.object({
  productId: zod.string().min(1, 'Product is required'),
  quantity: zod.number().min(1, 'Quantity must be at least 1'),
  unitPrice: zod.number().min(0, 'Price must be non-negative'),
});

const returnFormSchema = zod.object({
  supplierId: zod.coerce.number().min(1, 'Supplier is required'),
  locationId: zod.string().min(1, 'Location is required'),
  notes: zod.string().optional(),
  items: zod.array(returnItemSchema).min(1, 'At least one item is required'),
});

type ReturnFormValues = zod.infer<typeof returnFormSchema>;

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface SupplierReturnItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product: { name: string; sku: string };
}

export interface SupplierReturn {
  id: string;
  returnNumber: string;
  supplierId: number;
  supplier: { name: string };
  locationId: string;
  location: { name: string };
  returnDate: string;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  notes?: string;
  createdAt: string;
  items: SupplierReturnItem[];
}

interface ProductOption { id: string; name: string; sku: string; }

// ─── Product Combobox (portal, search, flip-up) ────────────────────────────────
function ProductCombobox({
  value, onChange, options, placeholder = 'Select product…', disabled = false, hasError = false,
}: {
  value: string; onChange: (id: string) => void; options: ProductOption[];
  placeholder?: string; disabled?: boolean; hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const DROPDOWN_H = 300;

  const selected = options.find(o => o.id === value);
  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.name.toLowerCase().includes(q) || (o.sku || '').toLowerCase().includes(q));
  }, [search, options]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || dropdownRef.current?.contains(t)) return;
      setOpen(false); setSearch('');
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 10); }, [open]);

  const handleOpen = () => {
    if (disabled) return;
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      const up = below < DROPDOWN_H && r.top > below;
      setStyle(up
        ? { position: 'fixed', bottom: window.innerHeight - r.top + 4, left: r.left, width: Math.max(r.width, 280), zIndex: 9999 }
        : { position: 'fixed', top: r.bottom + 4, left: r.left, width: Math.max(r.width, 280), zIndex: 9999 });
    }
    setOpen(o => !o); setSearch('');
  };

  return (
    <div ref={ref} className="relative w-full min-w-0">
      <button ref={triggerRef} type="button" disabled={disabled} onClick={handleOpen}
        className={`w-full flex items-center justify-between gap-2 h-9 px-3 rounded-lg border text-sm text-left transition-all overflow-hidden
          ${disabled ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
            : open ? 'border-primary ring-4 ring-primary/10 bg-white'
            : hasError ? 'border-red-300 bg-red-50/40'
            : 'border-slate-200 bg-white hover:border-slate-300'}`}>
        {selected ? (
          <span className="min-w-0 flex-1 flex items-center gap-1.5 overflow-hidden">
            <span className="block truncate font-medium text-slate-800 text-xs max-w-[120px]">{selected.name}</span>
            <span className="text-[10px] font-mono text-slate-400 shrink-0 bg-slate-100 px-1 py-0.5 rounded">{selected.sku || '—'}</span>
          </span>
        ) : (
          <span className="text-slate-400 text-xs truncate">{placeholder}</span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {selected && !disabled && (
            <span role="button" tabIndex={-1}
              onClick={e => { e.stopPropagation(); onChange(''); setOpen(false); setSearch(''); }}
              className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50">
              <LuX className="h-3 w-3" />
            </span>
          )}
          <LuChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div ref={dropdownRef} style={style} className="bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 h-9 focus-within:border-primary/60">
              <LuSearch className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input ref={inputRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search product…"
                className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder:text-slate-400" />
              {search && (
                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setSearch('')}
                  className="text-slate-400 hover:text-slate-600"><LuX className="h-3 w-3" /></button>
              )}
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto p-1" onMouseDown={e => e.preventDefault()}>
            {filtered.length === 0
              ? <div className="py-8 text-center">
                  <LuBoxes className="h-7 w-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No products found</p>
                </div>
              : filtered.map(opt => (
                  <button key={opt.id} type="button"
                    onClick={() => { onChange(opt.id); setOpen(false); setSearch(''); }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left transition-colors
                      ${value === opt.id ? 'bg-primary/5' : 'hover:bg-slate-50'}`}>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${value === opt.id ? 'text-primary' : 'text-slate-800'}`}>{opt.name}</p>
                      <p className="text-[11px] font-mono text-slate-400">{opt.sku || '—'}</p>
                    </div>
                    {value === opt.id && <LuCheck className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                ))}
          </div>
          <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50">
            <p className="text-[10px] text-slate-400">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        </div>, document.body
      )}
    </div>
  );
}

// ─── Default item ─────────────────────────────────────────────────────────────
const DEFAULT_ITEM = { productId: '', quantity: 1, unitPrice: 0 };

interface SupplierReturnFormProps {
  editingReturn?: SupplierReturn | null;
}

export default function SupplierReturnForm({ editingReturn }: SupplierReturnFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorItemIndex, setErrorItemIndex] = useState<number | null>(null);

  const { register, control, handleSubmit, setValue, watch, reset, formState: { errors } } =
    useForm<ReturnFormValues>({
      resolver: zodResolver(returnFormSchema) as any,
      defaultValues: {
        supplierId: 0,
        locationId: '',
        notes: '',
        items: [{ ...DEFAULT_ITEM }],
      },
    });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedLocationId = watch('locationId');
  const watchedItems = useWatch({ control, name: 'items' });

  // Populate form when editing
  useEffect(() => {
    if (editingReturn) {
      reset({
        supplierId: editingReturn.supplierId,
        locationId: editingReturn.locationId,
        notes: editingReturn.notes || '',
        items: editingReturn.items.length
          ? editingReturn.items.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice }))
          : [{ ...DEFAULT_ITEM }],
      });
    } else {
      reset({
        supplierId: 0,
        locationId: '',
        notes: '',
        items: [{ ...DEFAULT_ITEM }],
      });
    }
  }, [editingReturn, reset]);

  // ─── Queries ──────────────────────────────────────────────────────────────────
  const { data: suppliersRes } = useQuery({
    queryKey: ['supplier-return-form', 'suppliers'],
    queryFn: async () => (await apiClient.get<ApiResponse<any[]>>('/suppliers/get-all')).data.data,
  });

  const { data: locationsRes } = useQuery({
    queryKey: ['supplier-return-form', 'locations'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<any[]>>('/stocks/locations/get-all');
      return (res.data.data || []).filter((l: any) => l.status === 'ACTIVE');
    },
  });

  const { data: productsRes } = useQuery({
    queryKey: ['supplier-return-form', 'products'],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>('/products/get-all');
      const d = r.data.data;
      return Array.isArray(d) ? d : (d as any)?.data || [];
    },
  });

  // Location-scoped stocks — only products at the selected location
  const { data: locationStocksRes, isFetching: isLoadingLocationStocks } = useQuery({
    queryKey: ['supplier-return-form', 'location-stocks', watchedLocationId],
    queryFn: async () => {
      if (!watchedLocationId) return [];
      const r = await apiClient.get<ApiResponse<any>>('/stocks/get-all-paginated', {
        params: { locationId: watchedLocationId, limit: 500 },
      });
      const payload = r.data.data;
      return Array.isArray(payload) ? payload : (payload as any)?.data || [];
    },
    enabled: !!watchedLocationId,
  });

  // Product options — only products with stock at the selected location
  const productOptions: ProductOption[] = useMemo(() => {
    if (!locationStocksRes?.length) return [];
    return locationStocksRes.map((s: any) => ({
      id: s.productId,
      name: s.product?.name ?? '—',
      sku: s.product?.sku ?? '—',
    }));
  }, [locationStocksRes]);

  // Current qty map keyed by productId
  const stockQtyByProductId = useMemo(() => {
    const map: Record<string, number> = {};
    (locationStocksRes || []).forEach((s: any) => { map[s.productId] = s.quantity ?? 0; });
    return map;
  }, [locationStocksRes]);

  // When location changes, clear all item product selections
  const prevLocationRef = useRef<string>('');
  useEffect(() => {
    if (watchedLocationId && watchedLocationId !== prevLocationRef.current) {
      prevLocationRef.current = watchedLocationId;
      fields.forEach((_, i) => setValue(`items.${i}.productId`, '', { shouldValidate: false }));
      setErrorItemIndex(null);
    }
  }, [watchedLocationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProductSelect = (index: number, productId: string) => {
    setValue(`items.${index}.productId`, productId, { shouldValidate: true });
    setErrorItemIndex(null);
    // Auto-fill unit price from products flat list
    const p = productsRes?.find((x: any) => x.id === productId);
    if (p) {
      setValue(`items.${index}.unitPrice`, p.Baseprice ?? p.basePrice ?? p.finalPrice ?? 0);
    }
  };

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: ReturnFormValues) => apiClient.post<ApiResponse<any>>('/supplier-returns/create', payload),
    onSuccess: () => {
      toast.success('Draft supplier return created');
      queryClient.invalidateQueries({ queryKey: ['supplier-returns'] });
      router.push('/inventory/supplier-returns');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReturnFormValues }) =>
      apiClient.patch<ApiResponse<any>>(`/supplier-returns/update/${id}`, payload),
    onSuccess: () => {
      toast.success('Supplier return updated');
      queryClient.invalidateQueries({ queryKey: ['supplier-returns'] });
      router.push('/inventory/supplier-returns');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to update';
      toast.error(msg);
      // Highlight row if stock insufficient
      const match = msg.match(/product "(.+?)"/i);
      if (match && editingReturn) {
        const idx = watchedItems.findIndex(
          (item, i) => {
            const prodOpt = productOptions.find(o => o.id === item.productId);
            return prodOpt?.name?.toLowerCase() === match[1].toLowerCase();
          }
        );
        if (idx !== -1) setErrorItemIndex(idx);
      }
    },
  });

  const onSubmit = (values: ReturnFormValues) => {
    if (editingReturn) {
      updateMutation.mutate({ id: editingReturn.id, payload: values });
    } else {
      createMutation.mutate(values);
    }
  };

  // ─── Derived Totals ─────────────────────────────────────────────────────────
  const subtotal = useMemo(() =>
    (watchedItems || []).reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0),
    [watchedItems],
  );

  const totalQty = useMemo(() =>
    (watchedItems || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0),
    [watchedItems],
  );

  const validItems = (watchedItems || []).filter(i => i.productId && Number(i.quantity) >= 1);
  const isPending = createMutation.isPending || updateMutation.isPending;
  const canSubmit = validItems.length > 0 && !isPending;

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-center gap-4 bg-white px-5 sm:px-6 py-5 rounded-xl border border-slate-200 shadow-sm">
        <button type="button" onClick={() => router.push('/inventory/supplier-returns')}
          className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors shrink-0">
          <LuArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            {editingReturn ? `Edit Supplier Return — ${editingReturn.returnNumber}` : 'New Supplier Return'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Saves as DRAFT. Complete the return from the list page to deduct stock from the selected location.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">

        {/* ══ LEFT COLUMN ══ */}
        <div className="space-y-5 min-w-0">

          {/* ── Section 1: Return Details ── */}
          <Card className="p-5 sm:p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <LuTruck className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-semibold text-slate-800">Return Details</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Supplier */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <LuUser className="h-3.5 w-3.5" /> Supplier *
                </label>
                <select {...register('supplierId')}
                  className={`w-full h-11 bg-white border text-slate-800 text-sm rounded-xl outline-none px-3.5 focus:ring-4 focus:ring-primary/10 transition-all
                    ${errors.supplierId ? 'border-red-300' : 'border-slate-200 focus:border-primary/60'}`}>
                  <option value={0}>Select supplier…</option>
                  {suppliersRes?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {errors.supplierId && <p className="text-red-500 text-[11px]">{errors.supplierId.message}</p>}
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <LuMapPin className="h-3.5 w-3.5" /> Source Location *
                </label>
                <select {...register('locationId')}
                  className={`w-full h-11 bg-white border text-slate-800 text-sm rounded-xl outline-none px-3.5 focus:ring-4 focus:ring-primary/10 transition-all
                    ${errors.locationId ? 'border-red-300' : 'border-slate-200 focus:border-primary/60'}`}>
                  <option value="">Select location…</option>
                  {locationsRes?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                {errors.locationId && <p className="text-red-500 text-[11px]">{errors.locationId.message}</p>}
              </div>
            </div>
          </Card>

          {/* ── Section 2: Items ── */}
          <Card className="border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <LuBoxes className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-sm font-semibold text-slate-800">Return Items</h3>
                {fields.length > 0 && (
                  <span className="text-[11px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">{fields.length}</span>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" disabled={!watchedLocationId}
                onClick={() => { append({ ...DEFAULT_ITEM }); setErrorItemIndex(null); }}
                className="text-xs h-9 border-primary/30 text-primary hover:bg-primary/5 font-semibold">
                <LuPlus className="h-3.5 w-3.5 mr-1" /> Add row
              </Button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {!watchedLocationId ? (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <LucideAlertCircle className="h-4 w-4 shrink-0" />
                  Select a location first to see available products.
                </div>
              ) : isLoadingLocationStocks ? (
                <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 border border-primary/10 rounded-xl p-4">
                  <LuRefreshCw className="h-4 w-4 shrink-0 animate-spin" />
                  Loading products at this location…
                </div>
              ) : productOptions.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <LucideAlertCircle className="h-4 w-4 shrink-0" />
                  No stock found at this location. Receive stock first via GRN.
                </div>
              ) : (
                fields.map((field, index) => {
                  const pid = watchedItems?.[index]?.productId ?? '';
                  const availQty = stockQtyByProductId[pid] ?? 0;
                  const hasProduct = !!pid;
                  const isErrorRow = errorItemIndex === index;
                  const inputCls = `h-9 text-center bg-white border border-slate-200 text-slate-800 text-xs rounded-lg outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50`;

                  return (
                    <div key={field.id} className={`border rounded-xl p-3 bg-white hover:bg-slate-50/40 transition-colors ${isErrorRow ? 'bg-red-50 border-red-200' : 'border-slate-200'}`}>
                      <input type="hidden" {...register(`items.${index}.productId` as const)} />
                      
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_100px_120px_auto] gap-3 items-end">
                        {/* Product combobox */}
                        <div className="min-w-0">
                          <label className="text-[10px] font-semibold text-slate-500 uppercase mb-1.5 block">Product *</label>
                          <ProductCombobox
                            value={pid}
                            onChange={id => handleProductSelect(index, id)}
                            options={productOptions}
                            hasError={!!errors.items?.[index]?.productId || isErrorRow}
                          />
                          {errors.items?.[index]?.productId && (
                            <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                              <LucideAlertCircle className="h-3 w-3 shrink-0" />
                              {errors.items[index]?.productId?.message}
                            </p>
                          )}
                          {isErrorRow && <p className="text-[10px] text-red-600 mt-1 font-semibold">Insufficient stock</p>}
                        </div>

                        {/* Available Stock */}
                        <div className="text-center pb-2">
                          <label className="text-[10px] font-semibold text-slate-500 uppercase mb-2 block">Available</label>
                          <span className={`font-bold text-sm ${availQty === 0 && pid ? 'text-amber-600' : 'text-slate-600'}`}>
                            {pid ? availQty : <span className="text-slate-300">—</span>}
                          </span>
                        </div>

                        {/* Return Qty */}
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 uppercase mb-1.5 block">Return Qty *</label>
                          <input type="number" min={1} disabled={!hasProduct}
                            {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                            className={`w-full ${inputCls} ${errors.items?.[index]?.quantity ? 'border-red-400' : ''}`} />
                        </div>

                        {/* Unit Price */}
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 uppercase mb-1.5 block">Unit Price *</label>
                          <input type="number" min={0} step="0.01" disabled={!hasProduct}
                            {...register(`items.${index}.unitPrice` as const, { valueAsNumber: true })}
                            className={`w-full ${inputCls} ${errors.items?.[index]?.unitPrice ? 'border-red-400' : ''}`} />
                        </div>

                        {/* Delete button */}
                        {fields.length > 1 && (
                          <div className="flex items-end justify-center">
                            <button type="button"
                              onClick={() => remove(index)}
                              className="h-9 w-9 rounded-lg flex items-center justify-center transition-colors text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-200 hover:border-red-200">
                              <LuTrash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {errors.items && !Array.isArray(errors.items) && (
                <p className="text-xs text-red-500 flex items-center gap-1">{errors.items.message as string}</p>
              )}
            </div>
          </Card>

          {/* ── Section 3: Notes ── */}
          <Card className="p-5 sm:p-6 border border-slate-200 shadow-sm">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">
                Notes <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea rows={3} placeholder="Reason for return, damaged items notes, etc…"
                {...register('notes')}
                className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-xl outline-none px-3.5 py-2.5 focus:border-primary/60 focus:ring-4 focus:ring-primary/10 resize-none placeholder:text-slate-400 transition-all" />
            </div>
          </Card>
        </div>

        {/* ══ RIGHT COLUMN — sticky summary ══ */}
        <div className="lg:sticky lg:top-6 space-y-4">
          <Card className="p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-7 w-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                <LuClipboardList className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-semibold text-slate-800">Summary</h3>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Items</span>
                <span className="font-semibold text-slate-800">{validItems.length} / {fields.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total Returned Qty</span>
                <span className="font-semibold text-slate-800">
                  {totalQty} units
                </span>
              </div>
              <div className="h-px bg-slate-100" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Subtotal Amount</span>
                <span className="font-bold text-primary text-base">৳{subtotal.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-slate-200 shadow-sm">
            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={!canSubmit}
                className="w-full h-10 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2">
                {isPending && <LuRefreshCw className="animate-spin h-4 w-4" />}
                <LuCheck className="h-4 w-4" />
                {editingReturn ? 'Update Draft' : 'Save as Draft'}
              </Button>
              <Button type="button" variant="outline"
                onClick={() => router.push('/inventory/supplier-returns')}
                className="w-full h-10 text-sm font-semibold rounded-xl">
                Discard
              </Button>
            </div>
            {!canSubmit && !isPending && (
              <p className="text-[11px] text-slate-400 text-center mt-2">
                Add at least one product with return qty ≥ 1
              </p>
            )}
          </Card>
        </div>

      </form>
    </div>
  );
}
