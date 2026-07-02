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
  LuSearch, LuPlus, LuTrash, LuRefreshCw,
  LuChevronDown, LuCheck, LuX, LuBoxes, LuMapPin,
  LuArrowLeft,
} from 'react-icons/lu';
import { LucideAlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ─── Schemas ──────────────────────────────────────────────────────────────────
const adjustmentItemSchema = zod.object({
  productId: zod.string().min(1, 'Product is required'),
  quantityChanged: zod.number().refine(v => v !== 0, { message: 'Cannot be 0' }),
  reason: zod.string().optional(),
});

export const adjustmentFormSchema = zod.object({
  locationId: zod.string().min(1, 'Location is required'),
  reason: zod.string().optional(),
  items: zod.array(adjustmentItemSchema).min(1, 'At least one item is required'),
});

export type AdjustmentFormValues = zod.infer<typeof adjustmentFormSchema>;

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface AdjustmentItem {
  id: string;
  productId: string;
  previousQuantity: number;
  quantityChanged: number;
  currentQuantity: number;
  reason?: string;
  product: { name: string; sku: string };
}

export interface StockAdjustment {
  id: string;
  adjustmentNumber: string;
  locationId: string;
  location: { name: string };
  adjustmentDate: string;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  reason?: string;
  createdAt: string;
  items: AdjustmentItem[];
}

// ─── Product Combobox ──────────────────────────────────────────────────────────
interface ProductOption { id: string; name: string; sku: string }

function ProductCombobox({ value, onChange, options, placeholder = 'Select product…', disabled = false, hasError = false }: {
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
        ? { position: 'fixed', bottom: window.innerHeight - r.top + 4, left: r.left, width: Math.max(r.width, 260), zIndex: 9999 }
        : { position: 'fixed', top: r.bottom + 4, left: r.left, width: Math.max(r.width, 260), zIndex: 9999 });
    }
    setOpen(o => !o); setSearch('');
  };

  return (
    <div ref={ref} className="relative w-full">
      <div className={`w-full flex items-center h-9 rounded-lg border text-sm transition-all overflow-hidden
        ${disabled ? 'bg-slate-50 border-slate-200 opacity-60'
          : open ? 'bg-white border-primary ring-2 ring-primary/10'
          : hasError ? 'bg-white border-red-300' : 'bg-white border-slate-200 hover:border-slate-400'}`}>
        <button ref={triggerRef} type="button" disabled={disabled} onClick={handleOpen}
          className="flex items-center gap-2 min-w-0 flex-1 px-3 h-full text-left cursor-pointer disabled:cursor-not-allowed overflow-hidden">
          {selected
            ? <span className="font-medium text-slate-900 truncate text-xs block w-full">{selected.name}</span>
            : <span className="text-slate-400 text-xs">{placeholder}</span>}
        </button>
        {selected && !disabled
          ? <button type="button" tabIndex={-1} onClick={e => { e.stopPropagation(); onChange(''); setOpen(false); setSearch(''); }}
              className="px-2 h-full flex items-center text-slate-300 hover:text-red-400 transition-colors shrink-0">
              <LuX className="h-3.5 w-3.5" />
            </button>
          : <span className="px-2 flex items-center shrink-0 pointer-events-none">
              <LuChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </span>}
      </div>
      {open && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div ref={dropdownRef} style={style} className="bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 h-8 focus-within:border-primary/60">
              <LuSearch className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input ref={inputRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search…" className="flex-1 text-xs outline-none bg-transparent text-slate-800 placeholder:text-slate-400" />
              {search && <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setSearch('')}
                className="text-slate-400 hover:text-slate-600"><LuX className="h-3 w-3" /></button>}
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto" onMouseDown={e => e.preventDefault()}>
            {filtered.length === 0
              ? <div className="py-6 text-center text-xs text-slate-400">No products found</div>
              : <div className="p-1">{filtered.map(opt => (
                  <button key={opt.id} type="button"
                    onClick={() => { onChange(opt.id); setOpen(false); setSearch(''); }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left transition-colors
                      ${value === opt.id ? 'bg-primary/5' : 'hover:bg-slate-50'}`}>
                    <div className="min-w-0">
                      <p className={`text-xs font-medium truncate ${value === opt.id ? 'text-primary' : 'text-slate-900'}`}>{opt.name}</p>
                      <p className="text-[10px] font-mono text-slate-400">{opt.sku}</p>
                    </div>
                    {value === opt.id && <LuCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </button>
                ))}</div>}
          </div>
          <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50">
            <p className="text-[10px] text-slate-400">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        </div>, document.body)}
    </div>
  );
}

// ─── Main Form Component ───────────────────────────────────────────────────────
interface AdjustmentFormProps {
  editingAdj?: StockAdjustment | null;
}

export default function AdjustmentForm({ editingAdj }: AdjustmentFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!editingAdj;
  const [errorItemIndex, setErrorItemIndex] = useState<number | null>(null);

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentFormSchema) as any,
    defaultValues: { locationId: '', reason: '', items: [{ productId: '', quantityChanged: 0, reason: '' }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedLocationId = watch('locationId');
  const watchedItems = watch('items');

  // Pre-fill when editing
  useEffect(() => {
    if (editingAdj) {
      reset({
        locationId: editingAdj.locationId,
        reason: editingAdj.reason || '',
        items: editingAdj.items.length
          ? editingAdj.items.map(i => ({ productId: i.productId, quantityChanged: i.quantityChanged, reason: i.reason || '' }))
          : [{ productId: '', quantityChanged: 1, reason: '' }],
      });
    }
  }, [editingAdj, reset]);

  // Fetch locations
  const { data: locationsRes } = useQuery({
    queryKey: ['adj-form', 'locations'],
    queryFn: async () => (await apiClient.get<ApiResponse<any[]>>('/stocks/locations/get-all')).data.data,
  });

  // Fetch location-scoped stocks
  const { data: locationStocksRes, isFetching: isLoadingLocationStocks } = useQuery({
    queryKey: ['adj-form', 'location-stocks', watchedLocationId],
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
    return locationStocksRes.map((s: any) => ({ id: s.productId, name: s.product?.name ?? '—', sku: s.product?.sku ?? '—' }));
  }, [locationStocksRes]);

  const stockQtyByProductId = useMemo(() => {
    const map: Record<string, number> = {};
    (locationStocksRes || []).forEach((s: any) => { map[s.productId] = s.quantity ?? 0; });
    return map;
  }, [locationStocksRes]);

  // Clear products when location changes
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
    mutationFn: (payload: AdjustmentFormValues) => apiClient.post<ApiResponse<any>>('/stock-adjustments/create', payload),
    onSuccess: () => {
      toast.success('Draft adjustment created');
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
      router.push('/inventory/adjustments');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdjustmentFormValues }) =>
      apiClient.patch<ApiResponse<any>>(`/stock-adjustments/update/${id}`, payload),
    onSuccess: () => {
      toast.success('Adjustment updated');
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
      router.push('/inventory/adjustments');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update'),
  });

  const onSubmit = (values: AdjustmentFormValues) => {
    if (isEdit && editingAdj) { updateMutation.mutate({ id: editingAdj.id, payload: values }); }
    else { createMutation.mutate(values); }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4 bg-white px-6 py-5 rounded-2xl border border-slate-100 shadow-sm">
        <button type="button" onClick={() => router.push('/inventory/adjustments')}
          className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors shrink-0">
          <LuArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {isEdit ? `Edit — ${editingAdj!.adjustmentNumber}` : 'New Stock Adjustment'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEdit ? 'Update the draft, then complete it to apply stock changes.' : 'Saves as DRAFT first. Complete the draft to apply stock changes.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Section 1: Header details ── */}
        <Card className="px-6 py-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <LuMapPin className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">Adjustment Details</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[35%_1fr] gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">Location *</label>
              <select {...register('locationId')}
                className="w-full h-10 bg-white border border-slate-200 text-slate-800 text-sm rounded-lg outline-none px-3 focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all">
                <option value="">Select Location</option>
                {locationsRes?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              {errors.locationId && (
                <p className="text-red-500 text-[10px] flex items-center gap-1">
                  <LucideAlertCircle className="h-3 w-3" />{errors.locationId.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">
                Overall Reason <span className="font-normal text-slate-400">(Optional)</span>
              </label>
              <input type="text" placeholder="e.g. Cycle count, damage write-off…" {...register('reason')}
                className="w-full h-10 bg-white border border-slate-200 text-slate-800 text-sm rounded-lg outline-none px-3 focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all" />
            </div>
          </div>
        </Card>

        {/* ── Section 2: Items ── */}
        <Card className="border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/60">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <LuBoxes className="h-3.5 w-3.5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Items</h3>
              {fields.length > 0 && (
                <span className="text-[11px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">{fields.length}</span>
              )}
            </div>
            <Button type="button" variant="outline" size="sm" disabled={!watchedLocationId}
              onClick={() => { append({ productId: '', quantityChanged: 0, reason: '' }); setErrorItemIndex(null); }}
              className="text-xs h-8 border-primary/30 text-primary hover:bg-primary/5 font-medium">
              <LuPlus className="h-3.5 w-3.5 mr-1" /> Add Product
            </Button>
          </div>

          {!watchedLocationId ? (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-100 p-4">
              <LucideAlertCircle className="h-4 w-4 shrink-0" />
              Select a location first to see available products.
            </div>
          ) : isLoadingLocationStocks ? (
            <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 border-b border-primary/10 p-4">
              <LuRefreshCw className="h-4 w-4 shrink-0 animate-spin" />
              Loading products at this location…
            </div>
          ) : productOptions.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-100 p-4">
              <LucideAlertCircle className="h-4 w-4 shrink-0" />
              No stock found at this location. Receive stock first via GRN.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-100 border-b border-slate-300 font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-3">Product *</th>
                    <th className="px-4 py-3 text-center w-24">Current Qty</th>
                    <th className="px-4 py-3 text-center w-24">
                      <span className="text-green-700">Add (+)</span>
                    </th>
                    <th className="px-4 py-3 text-center w-24">
                      <span className="text-red-600">Deduct (−)</span>
                    </th>
                    <th className="px-4 py-3 text-center w-24">Final Qty</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {fields.map((field, index) => {
                    const pid = watchedItems?.[index]?.productId ?? '';
                    const prevQty = stockQtyByProductId[pid] ?? 0;
                    const changeQty = watchedItems?.[index]?.quantityChanged || 0;
                    const finalQty = prevQty + changeQty;
                    const isErrorRow = errorItemIndex === index;

                    // IDs selected in other rows — current row's own selection stays available
                    const otherSelectedIds = new Set(
                      (watchedItems || [])
                        .filter((_, i) => i !== index)
                        .map(item => item.productId)
                        .filter(Boolean)
                    );
                    const availableOptions = productOptions.filter(o => !otherSelectedIds.has(o.id));

                    return (
                      <tr key={field.id} className={`transition-colors ${isErrorRow ? 'bg-red-50' : pid ? 'bg-white hover:bg-primary/[0.02]' : 'bg-slate-50/40 hover:bg-slate-50/80'}`}>
                        <td className={`px-4 py-3 ${pid ? 'border-l-2 border-primary/40' : 'border-l-2 border-transparent'}`}>
                          <ProductCombobox
                            value={pid}
                            onChange={id => { setValue(`items.${index}.productId`, id, { shouldValidate: true }); setErrorItemIndex(null); }}
                            options={availableOptions}
                            disabled={isLoadingLocationStocks}
                            hasError={!!errors.items?.[index]?.productId || isErrorRow}
                          />
                          {errors.items?.[index]?.productId && (
                            <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1">
                              <LucideAlertCircle className="h-3 w-3 shrink-0" />
                              {errors.items[index]?.productId?.message}
                            </p>
                          )}
                          {isErrorRow && <p className="text-[10px] text-red-600 mt-0.5 font-semibold">Insufficient stock</p>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold text-sm ${!pid ? 'text-slate-300' : prevQty === 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                            {pid ? prevQty : '—'}
                          </span>
                        </td>
                        {/* Add field */}
                        <td className="px-4 py-3">
                          <input type="number" min={0}
                            disabled={!pid || changeQty < 0}
                            placeholder="0"
                            value={changeQty > 0 ? changeQty : changeQty < 0 ? 0 : ''}
                            onFocus={e => { if (Number(e.target.value) === 0) e.target.value = ''; }}
                            onChange={e => {
                              const v = e.target.value === '' ? 0 : Math.abs(Number(e.target.value));
                              setValue(`items.${index}.quantityChanged`, v, { shouldValidate: true });
                              setErrorItemIndex(null);
                            }}
                            className={`w-full h-9 text-center font-bold text-sm rounded-lg border outline-none transition-all
                              ${!pid
                                ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                                : changeQty < 0
                                  ? 'border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed opacity-40'
                                  : 'border-green-300 bg-green-50 text-green-700 placeholder:text-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-100'}`}
                          />
                        </td>
                        {/* Deduct field */}
                        <td className="px-4 py-3">
                          <input type="number" min={0}
                            disabled={!pid || changeQty > 0}
                            placeholder="0"
                            value={changeQty < 0 ? Math.abs(changeQty) : changeQty > 0 ? 0 : ''}
                            onFocus={e => { if (Number(e.target.value) === 0) e.target.value = ''; }}
                            onChange={e => {
                              const v = e.target.value === '' ? 0 : Math.abs(Number(e.target.value));
                              setValue(`items.${index}.quantityChanged`, v === 0 ? 0 : -v, { shouldValidate: true });
                              setErrorItemIndex(null);
                            }}
                            className={`w-full h-9 text-center font-bold text-sm rounded-lg border outline-none transition-all
                              ${!pid
                                ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                                : changeQty > 0
                                  ? 'border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed opacity-40'
                                  : 'border-red-300 bg-red-50 text-red-700 placeholder:text-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          {pid
                            ? <span className={`font-bold text-sm ${finalQty < 0 ? 'text-red-600' : 'text-primary'}`}>
                                {finalQty < 0 ? `⚠ ${finalQty}` : finalQty}
                              </span>
                            : <span className="text-slate-300 text-sm">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <input type="text" placeholder="e.g. damage, recount…"
                            {...register(`items.${index}.reason`)}
                            disabled={!pid}
                            className="w-full h-9 bg-white border border-slate-200 text-slate-700 text-xs rounded-lg outline-none px-3 focus:border-primary/60 focus:ring-2 focus:ring-primary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all placeholder:text-slate-400" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button type="button" disabled={fields.length === 1} onClick={() => fields.length > 1 && remove(index)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center mx-auto transition-colors
                              ${fields.length === 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}>
                            <LuTrash className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary bar */}
          {fields.length > 0 && watchedLocationId && productOptions.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-200">
              <span className="text-[11px] text-slate-400">{fields.length} item{fields.length !== 1 ? 's' : ''}</span>
              <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <span className="text-green-600 font-bold">+{(watchedItems || []).filter(i => i.quantityChanged > 0).reduce((s, i) => s + (i.quantityChanged || 0), 0)}</span>
                <span className="text-slate-300">/</span>
                <span className="text-red-500 font-bold">{(watchedItems || []).filter(i => i.quantityChanged < 0).reduce((s, i) => s + (i.quantityChanged || 0), 0)}</span>
                <span className="text-slate-400">net change</span>
              </span>
            </div>
          )}

          {errors.items && !Array.isArray(errors.items) && (
            <div className="px-4 py-3 border-t border-red-100 bg-red-50">
              <p className="text-xs text-red-500 flex items-center gap-1.5">
                <LucideAlertCircle className="h-3.5 w-3.5 shrink-0" />{errors.items.message}
              </p>
            </div>
          )}
        </Card>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => router.push('/inventory/adjustments')}
            className="text-sm">Discard</Button>
          <Button type="submit" disabled={isPending}
            className="bg-primary hover:bg-primary/90 text-white text-sm font-semibold px-6 rounded-xl">
            {isPending && <LuRefreshCw className="animate-spin h-4 w-4 mr-2" />}
            {isEdit ? 'Update Draft' : 'Save as Draft'}
          </Button>
        </div>
      </form>
    </div>
  );
}
