'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/auth';
import {
  LuSearch, LuPlus, LuTrash2, LuRefreshCw, LuChevronDown, LuCheck, LuX,
  LuBoxes, LuMapPin, LuArrowLeft, LuClipboardList, LuTriangleAlert, LuInfo,
} from 'react-icons/lu';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ─── Schemas ──────────────────────────────────────────────────────────────────
const damageItemSchema = zod.object({
  productId: zod.string().min(1, 'Product is required'),
  quantity: zod.number().min(1, 'Quantity must be at least 1'),
  reason: zod.enum(['DAMAGED', 'BROKEN', 'LOST', 'EXPIRED']),
});

export const damageFormSchema = zod.object({
  locationId: zod.string().min(1, 'Location is required'),
  notes: zod.string().optional(),
  items: zod.array(damageItemSchema).min(1, 'At least one item is required'),
});

export type DamageFormValues = zod.infer<typeof damageFormSchema>;

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface DamageItem {
  id: string;
  productId: string;
  quantity: number;
  reason: 'DAMAGED' | 'BROKEN' | 'LOST' | 'EXPIRED';
  product: { name: string; sku: string };
}

export interface Damage {
  id: string;
  damageNumber: string;
  locationId: string;
  location: { name: string };
  damageDate: string;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdAt: string;
  items: DamageItem[];
}

// ─── Reason helpers ────────────────────────────────────────────────────────────
export const reasonLabels: Record<string, string> = {
  DAMAGED: 'Physically Damaged',
  BROKEN: 'Broken',
  LOST: 'Lost / Missing',
  EXPIRED: 'Expired',
};

export const reasonBadgeColors: Record<string, string> = {
  DAMAGED: 'bg-amber-100 text-amber-800',
  BROKEN: 'bg-orange-100 text-orange-800',
  LOST: 'bg-slate-100 text-slate-600',
  EXPIRED: 'bg-red-100 text-red-800',
};

// ─── Product Combobox ──────────────────────────────────────────────────────────
interface ProductOption { id: string; name: string; sku: string; quantity?: number }

function ProductCombobox({ value, onChange, options, placeholder = 'Select a product…', disabled = false, hasError = false }: {
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
    return options.filter(o => o.name.toLowerCase().includes(q) || o.sku.toLowerCase().includes(q));
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
        ? { position: 'fixed', bottom: window.innerHeight - r.top + 4, left: r.left, width: Math.max(r.width, 300), zIndex: 9999 }
        : { position: 'fixed', top: r.bottom + 4, left: r.left, width: Math.max(r.width, 300), zIndex: 9999 });
    }
    setOpen(o => !o); setSearch('');
  };

  return (
    <div ref={ref} className="relative w-full">
      <button ref={triggerRef} type="button" disabled={disabled} onClick={handleOpen}
        className={`w-full flex items-center justify-between gap-2 h-12 px-4 rounded-xl border text-sm text-left transition-all
          ${disabled ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
            : open ? 'border-rose-500 ring-4 ring-rose-100 bg-white'
            : hasError ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
        {selected ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-slate-800">{selected.name}</span>
            <span className="block text-[11px] font-mono text-slate-400">
              {selected.sku}{selected.quantity !== undefined ? ` · ${selected.quantity} in stock` : ''}
            </span>
          </span>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {selected && !disabled && (
            <span role="button" tabIndex={-1}
              onClick={(e) => { e.stopPropagation(); onChange(''); setOpen(false); setSearch(''); }}
              className="p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50">
              <LuX className="h-3.5 w-3.5" />
            </span>
          )}
          <LuChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div ref={dropdownRef} style={style} className="bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 h-9 focus-within:border-rose-400">
              <LuSearch className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input ref={inputRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or SKU…"
                className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder:text-slate-400" />
              {search && <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setSearch('')}
                className="text-slate-400 hover:text-slate-600"><LuX className="h-3 w-3" /></button>}
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-1" onMouseDown={e => e.preventDefault()}>
            {filtered.length === 0
              ? <div className="py-8 text-center text-sm text-slate-400">No products found</div>
              : filtered.map(opt => (
                  <button key={opt.id} type="button"
                    onClick={() => { onChange(opt.id); setOpen(false); setSearch(''); }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left transition-colors
                      ${value === opt.id ? 'bg-rose-50' : 'hover:bg-slate-50'}`}>
                    <span className="min-w-0">
                      <span className={`block text-sm font-medium truncate ${value === opt.id ? 'text-rose-700' : 'text-slate-800'}`}>{opt.name}</span>
                      <span className="block text-[11px] font-mono text-slate-400">
                        {opt.sku}{opt.quantity !== undefined ? ` · ${opt.quantity} in stock` : ''}
                      </span>
                    </span>
                    {value === opt.id && <LuCheck className="h-4 w-4 text-rose-600 shrink-0" />}
                  </button>
                ))}
          </div>
          <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50">
            <p className="text-[10px] text-slate-400">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        </div>, document.body)}
    </div>
  );
}

// ─── Main Form Component ───────────────────────────────────────────────────────
interface DamageFormProps {
  editingDmg?: Damage | null;
}

export default function DamageForm({ editingDmg }: DamageFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!editingDmg;
  const [errorItemIndex, setErrorItemIndex] = useState<number | null>(null);

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<DamageFormValues>({
    resolver: zodResolver(damageFormSchema) as any,
    defaultValues: { locationId: '', notes: '', items: [{ productId: '', quantity: 1, reason: 'DAMAGED' }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedLocationId = watch('locationId');
  const watchedItems = watch('items');

  // Pre-fill when editing
  useEffect(() => {
    if (editingDmg) {
      reset({
        locationId: editingDmg.locationId,
        notes: editingDmg.notes || '',
        items: editingDmg.items.length
          ? editingDmg.items.map(i => ({ productId: i.productId, quantity: i.quantity, reason: i.reason }))
          : [{ productId: '', quantity: 1, reason: 'DAMAGED' }],
      });
    }
  }, [editingDmg, reset]);

  // Fetch locations — only active ones can have stock deducted
  const { data: locationsRes } = useQuery({
    queryKey: ['dmg-form', 'locations'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<any[]>>('/stocks/locations/get-all');
      return (res.data.data || []).filter((loc: any) => loc.status === 'ACTIVE');
    },
  });

  // Fetch location-scoped stocks
  const { data: locationStocksRes, isFetching: isLoadingLocationStocks } = useQuery({
    queryKey: ['dmg-form', 'location-stocks', watchedLocationId],
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

  const productOptions: ProductOption[] = useMemo(() => {
    if (!locationStocksRes?.length) return [];
    return locationStocksRes.map((s: any) => ({
      id: s.productId, name: s.product?.name ?? '—', sku: s.product?.sku ?? '—', quantity: s.quantity ?? 0,
    }));
  }, [locationStocksRes]);

  const stockQtyByProductId = useMemo(() => {
    const map: Record<string, number> = {};
    (locationStocksRes || []).forEach((s: any) => { map[s.productId] = s.quantity ?? 0; });
    return map;
  }, [locationStocksRes]);

  // Clear products when location changes (not in edit mode)
  const prevLocationRef = useRef<string>('');
  useEffect(() => {
    if (watchedLocationId && watchedLocationId !== prevLocationRef.current) {
      prevLocationRef.current = watchedLocationId;
      if (!isEdit) {
        fields.forEach((_, i) => setValue(`items.${i}.productId`, '', { shouldValidate: false }));
      }
      setErrorItemIndex(null);
    }
  }, [watchedLocationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: DamageFormValues) => apiClient.post<ApiResponse<any>>('/damages/create', payload),
    onSuccess: () => {
      toast.success('Draft damage report created');
      queryClient.invalidateQueries({ queryKey: ['damages'] });
      router.push('/inventory/damages');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DamageFormValues }) =>
      apiClient.patch<ApiResponse<any>>(`/damages/update/${id}`, payload),
    onSuccess: () => {
      toast.success('Damage report updated');
      queryClient.invalidateQueries({ queryKey: ['damages'] });
      router.push('/inventory/damages');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update'),
  });

  const onSubmit = (values: DamageFormValues) => {
    if (isEdit && editingDmg) { updateMutation.mutate({ id: editingDmg.id, payload: values }); }
    else { createMutation.mutate(values); }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const locationName = locationsRes?.find((l: any) => l.id === watchedLocationId)?.name;

  // Derived summary
  const validItems = (watchedItems || []).filter(i => i.productId && i.quantity > 0);
  const totalWriteOff = validItems.reduce((s, i) => s + (i.quantity || 0), 0);
  const exceedsStockCount = validItems.filter(i => {
    const avail = stockQtyByProductId[i.productId] ?? 0;
    return i.quantity > avail;
  }).length;
  const canSubmit = !!watchedLocationId && validItems.length > 0;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-4 bg-white px-5 sm:px-6 py-5 rounded-xl border border-slate-200 shadow-sm">
        <button type="button" onClick={() => router.push('/inventory/damages')}
          className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors shrink-0">
          <LuArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
            {isEdit ? `Edit — ${editingDmg!.damageNumber}` : 'Add Damaged / Lost Inventory'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEdit ? 'Update the draft, then complete it to write off stock.' : 'Saved as a draft first — complete it afterwards to write off the stock.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">

        {/* ── LEFT: form ── */}
        <div className="space-y-5 min-w-0">

          {/* Section 1: Details */}
          <Card className="p-5 sm:p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-7 w-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <LuMapPin className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-semibold text-slate-800">Where and what happened</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[35%_65%] gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 block">Location *</label>
                <select {...register('locationId')}
                  className="w-full h-11 bg-white border border-slate-200 text-slate-800 text-sm rounded-xl outline-none px-3.5 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 transition-all">
                  <option value="">Select a location…</option>
                  {locationsRes?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                {errors.locationId && (
                  <p className="text-red-500 text-[11px] flex items-center gap-1">
                    <LuTriangleAlert className="h-3 w-3" />{errors.locationId.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 block">
                  Notes <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input type="text" placeholder="e.g. Shelf collapse, expiry inspection, flood…" {...register('notes')}
                  className="w-full h-11 bg-white border border-slate-200 text-slate-800 text-sm rounded-xl outline-none px-3.5 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 transition-all" />
              </div>
            </div>
          </Card>

          {/* Section 2: Items */}
          <Card className="border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <LuBoxes className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-sm font-semibold text-slate-800">Items to Write Off</h3>
                {fields.length > 0 && (
                  <span className="text-[11px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">{fields.length}</span>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" disabled={!watchedLocationId}
                onClick={() => { append({ productId: '', quantity: 1, reason: 'DAMAGED' }); setErrorItemIndex(null); }}
                className="text-xs h-9 border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold">
                <LuPlus className="h-3.5 w-3.5 mr-1" /> Add product
              </Button>
            </div>

            <div className="p-4 sm:p-5">
              {!watchedLocationId ? (
                <div className="flex items-center gap-2.5 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <LuInfo className="h-4 w-4 shrink-0" /> Pick a location above to see available products.
                </div>
              ) : isLoadingLocationStocks ? (
                <div className="flex items-center gap-2.5 text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-4">
                  <LuRefreshCw className="h-4 w-4 shrink-0 animate-spin" /> Loading products at this location…
                </div>
              ) : productOptions.length === 0 ? (
                <div className="flex items-center gap-2.5 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <LuTriangleAlert className="h-4 w-4 shrink-0" /> No stock at this location yet — receive stock first via GRN.
                </div>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, index) => {
                    const pid = watchedItems?.[index]?.productId ?? '';
                    const availableQty = stockQtyByProductId[pid] ?? 0;
                    const writeoffQty = watchedItems?.[index]?.quantity || 0;
                    const exceedsStock = !!pid && writeoffQty > availableQty;
                    const isErrorRow = errorItemIndex === index;

                    const otherSelectedIds = new Set(
                      (watchedItems || []).filter((_, i) => i !== index).map(item => item.productId).filter(Boolean)
                    );
                    const availableOptions = productOptions.filter(o => !otherSelectedIds.has(o.id));

                    return (
                      <div key={field.id}
                        className={`rounded-2xl border p-4 transition-colors ${exceedsStock || isErrorRow ? 'border-red-200 bg-red-50/40' : 'border-slate-200 bg-white'}`}>
                        <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-4 items-start">
                          {/* Left: product */}
                          <div className="flex items-center gap-3 w-full">
                            <span className="h-7 w-7 shrink-0 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold flex items-center justify-center">
                              {index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <ProductCombobox
                                value={pid}
                                onChange={id => {
                                  setValue(`items.${index}.productId`, id, { shouldValidate: true });
                                  setErrorItemIndex(null);
                                }}
                                options={availableOptions}
                                disabled={isLoadingLocationStocks}
                                hasError={!!errors.items?.[index]?.productId || isErrorRow}
                              />
                              {errors.items?.[index]?.productId && (
                                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                                  <LuTriangleAlert className="h-3 w-3 shrink-0" />
                                  {errors.items[index]?.productId?.message}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right: qty, reason, remove */}
                          <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-start lg:pl-6 lg:border-l lg:border-slate-200">
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                                Avail. Qty
                              </p>
                              <p className={`text-base font-bold ${!pid ? 'text-slate-200' : availableQty === 0 ? 'text-amber-500' : 'text-slate-700'}`}>
                                {pid ? availableQty : '—'}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                                Write-off Qty *
                              </p>
                              <input type="number" min={1} disabled={!pid}
                                {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                                placeholder="0"
                                className={`w-full h-10 text-center font-bold text-sm rounded-xl border outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed
                                  ${exceedsStock
                                    ? 'border-red-400 bg-red-50 text-red-700 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                    : 'border-rose-200 bg-rose-50 text-rose-700 focus:border-rose-400 focus:ring-4 focus:ring-rose-100'}`} />
                              {errors.items?.[index]?.quantity && (
                                <p className="text-[10px] text-red-500">{(errors.items[index]?.quantity as any)?.message}</p>
                              )}
                              {exceedsStock && <p className="text-[10px] text-red-600 font-semibold">Exceeds stock</p>}
                            </div>

                            <button type="button" disabled={fields.length === 1} onClick={() => fields.length > 1 && remove(index)}
                              title="Remove line"
                              className={`h-9 w-9 rounded-lg flex items-center justify-center mt-5 shrink-0 transition-colors ${fields.length === 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}>
                              <LuTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Reason select (full width) */}
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">Reason *</label>
                          <select {...register(`items.${index}.reason`)} disabled={!pid}
                            className="w-full h-10 bg-white border border-slate-200 text-slate-700 text-sm rounded-xl outline-none px-3.5 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                            <option value="DAMAGED">Physically Damaged</option>
                            <option value="BROKEN">Broken</option>
                            <option value="LOST">Lost / Missing</option>
                            <option value="EXPIRED">Expired</option>
                          </select>
                        </div>

                        {isErrorRow && (
                          <p className="mt-2 pl-9 text-[11px] font-semibold text-red-600">Insufficient stock</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {errors.items && !Array.isArray(errors.items) && (
                <div className="mt-3 px-4 py-3 rounded-xl border border-red-100 bg-red-50">
                  <p className="text-xs text-red-500 flex items-center gap-1.5">
                    <LuTriangleAlert className="h-3.5 w-3.5 shrink-0" />{errors.items.message}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── RIGHT: sticky summary + actions ── */}
        <div className="lg:sticky lg:top-6 space-y-4">
          <Card className="p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-7 w-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                <LuClipboardList className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-semibold text-slate-800">Summary</h3>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Location</span>
                <span className={`font-semibold ${locationName ? 'text-slate-800' : 'text-slate-300'}`}>{locationName || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Items to write off</span>
                <span className="font-semibold text-slate-800">{validItems.length} / {fields.length}</span>
              </div>
              <div className="h-px bg-slate-100" />
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total units</span>
                <span className="font-bold text-rose-600">{totalWriteOff}</span>
              </div>
            </div>

            {exceedsStockCount > 0 && (
              <div className="mt-4 flex items-start gap-2 text-xs font-medium text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">
                <LuTriangleAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {exceedsStockCount} line{exceedsStockCount > 1 ? 's' : ''} exceed available stock. Fix before saving.
              </div>
            )}

            <div className="mt-4 flex items-start gap-2 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-3">
              <LuTriangleAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Completing this report will permanently deduct quantities from stock.
            </div>
          </Card>

          <Card className="p-4 border border-slate-200 shadow-sm -space-y-2">
            <Button type="submit" disabled={isPending || !canSubmit || exceedsStockCount > 0}
              className="w-full h-11 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2">
              {isPending && <LuRefreshCw className="animate-spin h-4 w-4" />}
              {isEdit ? 'Update draft' : 'Save as draft'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/inventory/damages')}
              className="w-full h-11 text-sm font-semibold rounded-xl">
              Discard
            </Button>
            {!canSubmit && !isPending && (
              <p className="text-[11px] text-slate-400 text-center pt-1">
                {!watchedLocationId ? 'Select a location to continue' : 'Add at least one item with a quantity'}
              </p>
            )}
          </Card>
        </div>
      </form>
    </div>
  );
}
