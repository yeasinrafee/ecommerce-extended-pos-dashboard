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
  LuBoxes, LuMapPin, LuArrowLeft, LuClipboardList, LuInfo, LuTriangleAlert,
  LuArrowRight, LuWarehouse,
} from 'react-icons/lu';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ─── Schemas ──────────────────────────────────────────────────────────────────
const transferItemSchema = zod.object({
  productId: zod.string().min(1, 'Product is required'),
  quantity: zod.number().min(1, 'Must be at least 1'),
});

export const transferFormSchema = zod.object({
  sourceLocationId: zod.string().min(1, 'Source location is required'),
  destinationLocationId: zod.string().min(1, 'Destination location is required'),
  notes: zod.string().optional(),
  items: zod.array(transferItemSchema).min(1, 'At least one item is required'),
}).refine(d => d.sourceLocationId !== d.destinationLocationId, {
  message: 'Source and destination must be different',
  path: ['destinationLocationId'],
});

export type TransferFormValues = zod.infer<typeof transferFormSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TransferItem {
  id: string;
  productId: string;
  quantity: number;
  receivedQuantity: number;
  product: { name: string; sku: string };
}

export interface StockTransfer {
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

// ─── Product Combobox ─────────────────────────────────────────────────────────
interface ProductOption { id: string; name: string; sku: string; availableQty: number; }

function ProductCombobox({
  value, onChange, options, placeholder = 'Select a product…', disabled = false, hasError = false,
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
      const up = below < 300 && r.top > below;
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
            : open ? 'border-primary ring-4 ring-primary/10 bg-white'
            : hasError ? 'border-red-300 bg-red-50/40'
            : 'border-slate-200 bg-white hover:border-slate-300'}`}>
        {selected ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-slate-800">{selected.name}</span>
            <span className="block text-[11px] font-mono text-slate-400">
              {selected.sku} · {selected.availableQty} available
            </span>
          </span>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {selected && !disabled && (
            <span role="button" tabIndex={-1}
              onClick={e => { e.stopPropagation(); onChange(''); setOpen(false); setSearch(''); }}
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
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 h-9 focus-within:border-primary/60">
              <LuSearch className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input ref={inputRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or SKU…"
                className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder:text-slate-400" />
              {search && (
                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setSearch('')}
                  className="text-slate-400 hover:text-slate-600"><LuX className="h-3 w-3" /></button>
              )}
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-1" onMouseDown={e => e.preventDefault()}>
            {filtered.length === 0
              ? <div className="py-8 text-center text-sm text-slate-400">No products found</div>
              : filtered.map(opt => {
                  const isOut = opt.availableQty === 0;
                  const isLow = opt.availableQty > 0 && opt.availableQty <= 5;
                  return (
                    <button key={opt.id} type="button"
                      onClick={() => { onChange(opt.id); setOpen(false); setSearch(''); }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left transition-colors
                        ${value === opt.id ? 'bg-primary/5' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOut ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-green-400'}`} />
                        <span className="min-w-0">
                          <span className={`block text-sm font-medium truncate ${value === opt.id ? 'text-primary' : 'text-slate-800'}`}>{opt.name}</span>
                          <span className="block text-[11px] font-mono text-slate-400">{opt.sku}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isOut ? 'bg-red-100 text-red-700' : isLow ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                          {opt.availableQty} avail
                        </span>
                        {value === opt.id && <LuCheck className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                    </button>
                  );
                })}
          </div>
          <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50">
            <p className="text-[10px] text-slate-400">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        </div>, document.body
      )}
    </div>
  );
}

// ─── Main Form Component ──────────────────────────────────────────────────────
interface TransferFormProps {
  editingTransfer?: StockTransfer | null;
}

export default function TransferForm({ editingTransfer }: TransferFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!editingTransfer;

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } =
    useForm<TransferFormValues>({
      resolver: zodResolver(transferFormSchema) as any,
      defaultValues: {
        sourceLocationId: '',
        destinationLocationId: '',
        notes: '',
        items: [{ productId: '', quantity: 1 }],
      },
    });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedSourceId = watch('sourceLocationId');
  const watchedDestId   = watch('destinationLocationId');
  const watchedItems    = watch('items');

  // Pre-fill when editing
  useEffect(() => {
    if (editingTransfer) {
      reset({
        sourceLocationId:      editingTransfer.sourceLocationId,
        destinationLocationId: editingTransfer.destinationLocationId,
        notes: editingTransfer.notes || '',
        items: editingTransfer.items?.length
          ? editingTransfer.items.map(i => ({ productId: i.productId, quantity: i.quantity }))
          : [{ productId: '', quantity: 1 }],
      });
    }
  }, [editingTransfer, reset]);

  // ─── Queries ─────────────────────────────────────────────────────────────────
  const { data: locationsRes } = useQuery({
    queryKey: ['transfer-form', 'locations'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<any[]>>('/stocks/locations/get-all');
      // Filter to only active locations
      return (res.data.data || []).filter((loc: any) => loc.status === 'ACTIVE');
    },
  });

  const { data: sourceStocksRes, isFetching: isLoadingSourceStocks } = useQuery({
    queryKey: ['transfer-form', 'source-stocks', watchedSourceId],
    queryFn: async () => {
      if (!watchedSourceId) return [];
      const r = await apiClient.get<ApiResponse<any>>('/stocks/get-all-paginated', {
        params: { locationId: watchedSourceId, limit: 500 },
      });
      const payload = r.data.data;
      return Array.isArray(payload) ? payload : (payload as any)?.data || [];
    },
    enabled: !!watchedSourceId,
  });

  const productOptions: ProductOption[] = useMemo(() => {
    if (!sourceStocksRes?.length) return [];
    return sourceStocksRes
      .filter((s: any) => s.quantity > 0)
      .map((s: any) => ({
        id: s.productId,
        name: s.product?.name ?? '—',
        sku:  s.product?.sku  ?? '—',
        availableQty: s.quantity - (s.reservedQuantity ?? 0),
      }));
  }, [sourceStocksRes]);

  const availableQtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    productOptions.forEach(p => { map[p.id] = p.availableQty; });
    return map;
  }, [productOptions]);

  // Clear product selections when source changes (create only)
  const prevSourceRef = useRef('');
  useEffect(() => {
    if (watchedSourceId && watchedSourceId !== prevSourceRef.current) {
      prevSourceRef.current = watchedSourceId;
      if (!isEdit) {
        fields.forEach((_, i) =>
          setValue(`items.${i}.productId`, '', { shouldValidate: false })
        );
      }
    }
  }, [watchedSourceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Mutations ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: TransferFormValues) =>
      apiClient.post<ApiResponse<any>>('/stock-transfers/create', payload),
    onSuccess: () => {
      toast.success('Transfer created as draft');
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      router.push('/inventory/transfers');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create transfer'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TransferFormValues }) =>
      apiClient.patch<ApiResponse<any>>(`/stock-transfers/update/${id}`, payload),
    onSuccess: () => {
      toast.success('Transfer updated');
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      router.push('/inventory/transfers');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update transfer'),
  });

  const onSubmit = (values: TransferFormValues) => {
    if (isEdit && editingTransfer) updateMutation.mutate({ id: editingTransfer.id, payload: values });
    else createMutation.mutate(values);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // ─── Derived summary ──────────────────────────────────────────────────────────
  const sourceName = locationsRes?.find((l: any) => l.id === watchedSourceId)?.name;
  const destName   = locationsRes?.find((l: any) => l.id === watchedDestId)?.name;

  const validItems = (watchedItems || []).filter(i => i.productId && Number(i.quantity) > 0);
  const totalUnits = validItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const overLimitCount = (watchedItems || []).filter(i => {
    if (!i.productId) return false;
    return (Number(i.quantity) || 0) > (availableQtyMap[i.productId] ?? 0);
  }).length;
  const canSubmit = !!watchedSourceId && !!watchedDestId && validItems.length > 0 && overLimitCount === 0;

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-center gap-4 bg-white px-5 sm:px-6 py-5 rounded-xl border border-slate-200 shadow-sm">
        <button type="button" onClick={() => router.push('/inventory/transfers')}
          className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors shrink-0">
          <LuArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
            {isEdit ? `Edit — ${editingTransfer!.transferNumber}` : 'New Stock Transfer'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEdit
              ? 'Update the draft transfer, then ship it to move stock.'
              : 'Saved as a draft first — ship it afterwards to deduct from source.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">

        {/* ══ LEFT COLUMN ══════════════════════════════════════════════════════ */}
        <div className="space-y-5 min-w-0">

          {/* ── Section 1: Route ── */}
          <Card className="p-5 sm:p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <LuMapPin className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-semibold text-slate-800">Transfer Route</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-end gap-4">
              {/* Source */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <LuWarehouse className="h-3.5 w-3.5" /> Source Location *
                </label>
                <select {...register('sourceLocationId')}
                  className={`w-full h-11 bg-white border text-slate-800 text-sm rounded-xl outline-none px-3.5 focus:ring-4 focus:ring-primary/10 transition-all ${errors.sourceLocationId ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-primary/60'}`}>
                  <option value="">Select source…</option>
                  {locationsRes?.map((l: any) => (
                    <option key={l.id} value={l.id}>{l.name} — {l.code}</option>
                  ))}
                </select>
                {errors.sourceLocationId && (
                  <p className="text-red-500 text-[11px] flex items-center gap-1">
                    <LuTriangleAlert className="h-3 w-3" />{errors.sourceLocationId.message}
                  </p>
                )}
              </div>

              {/* Arrow */}
              <div className="hidden sm:flex items-center justify-center pb-3">
                <div className="flex items-center gap-1">
                  <div className="w-8 h-px bg-slate-300" />
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <LuArrowRight className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="w-8 h-px bg-slate-300" />
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <LuMapPin className="h-3.5 w-3.5" /> Destination Location *
                </label>
                <select {...register('destinationLocationId')}
                  className={`w-full h-11 bg-white border text-slate-800 text-sm rounded-xl outline-none px-3.5 focus:ring-4 focus:ring-primary/10 transition-all ${errors.destinationLocationId ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-primary/60'}`}>
                  <option value="">Select destination…</option>
                  {locationsRes?.filter((l: any) => l.id !== watchedSourceId).map((l: any) => (
                    <option key={l.id} value={l.id}>{l.name} — {l.code}</option>
                  ))}
                </select>
                {errors.destinationLocationId && (
                  <p className="text-red-500 text-[11px] flex items-center gap-1">
                    <LuTriangleAlert className="h-3 w-3" />{errors.destinationLocationId.message}
                  </p>
                )}
              </div>
            </div>

            {/* Source stock preview */}
            {watchedSourceId && !isLoadingSourceStocks && (
              <div className={`mt-4 rounded-xl border p-3.5 ${productOptions.length === 0 ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <LuWarehouse className={`h-4 w-4 shrink-0 ${productOptions.length === 0 ? 'text-amber-500' : 'text-slate-500'}`} />
                  <p className={`text-xs font-semibold ${productOptions.length === 0 ? 'text-amber-800' : 'text-slate-700'}`}>
                    Stock at {sourceName}
                  </p>
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${productOptions.length === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                    {productOptions.length} SKU{productOptions.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {productOptions.length === 0 ? (
                  <p className="text-xs text-amber-700 flex items-center gap-1.5">
                    <LuTriangleAlert className="h-3.5 w-3.5 shrink-0" /> No transferable stock at this location.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {productOptions.slice(0, 8).map(p => (
                      <span key={p.id} className="inline-flex items-center gap-1 text-[11px] bg-white border border-slate-200 rounded-full px-2 py-0.5 text-slate-700 font-medium">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.availableQty <= 5 ? 'bg-amber-400' : 'bg-green-400'}`} />
                        <span className="max-w-[80px] truncate">{p.name}</span>: <strong>{p.availableQty}</strong>
                      </span>
                    ))}
                    {productOptions.length > 8 && (
                      <span className="text-[11px] text-slate-500 font-medium px-1">+{productOptions.length - 8} more</span>
                    )}
                  </div>
                )}
              </div>
            )}
            {watchedSourceId && isLoadingSourceStocks && (
              <div className="mt-4 flex items-center gap-2.5 text-sm text-primary bg-primary/5 border border-primary/10 rounded-xl p-4">
                <LuRefreshCw className="h-4 w-4 shrink-0 animate-spin" /> Loading stock at this location…
              </div>
            )}
          </Card>

          {/* ── Section 2: Items ── */}
          <Card className="border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <LuBoxes className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-sm font-semibold text-slate-800">Products to Transfer</h3>
                {fields.length > 0 && (
                  <span className="text-[11px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                    {fields.length}
                  </span>
                )}
              </div>
              <Button type="button" variant="outline" size="sm"
                disabled={!watchedSourceId || productOptions.length === 0}
                onClick={() => append({ productId: '', quantity: 1 })}
                className="text-xs h-9 border-primary/30 text-primary hover:bg-primary/5 font-semibold">
                <LuPlus className="h-3.5 w-3.5 mr-1" /> Add product
              </Button>
            </div>

            <div className="p-4 sm:p-5">
              {!watchedSourceId ? (
                <div className="flex items-center gap-2.5 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <LuInfo className="h-4 w-4 shrink-0" /> Pick a source location above to see available stock.
                </div>
              ) : isLoadingSourceStocks ? (
                <div className="flex items-center gap-2.5 text-sm text-primary bg-primary/5 border border-primary/10 rounded-xl p-4">
                  <LuRefreshCw className="h-4 w-4 shrink-0 animate-spin" /> Loading products at this location…
                </div>
              ) : productOptions.length === 0 ? (
                <div className="flex items-center gap-2.5 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <LuTriangleAlert className="h-4 w-4 shrink-0" /> No stock at this location — receive stock first via GRN.
                </div>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, index) => {
                    const pid       = watchedItems?.[index]?.productId ?? '';
                    const availQty  = availableQtyMap[pid] ?? 0;
                    const qty       = Number(watchedItems?.[index]?.quantity) || 0;
                    const overLimit = !!pid && qty > availQty;

                    // Exclude products already chosen on other rows
                    const otherSelected = new Set(
                      (watchedItems || [])
                        .filter((_, i) => i !== index)
                        .map(item => item.productId)
                        .filter(Boolean)
                    );
                    const availableOptions = productOptions.filter(o => !otherSelected.has(o.id));

                    return (
                      <div key={field.id}
                        className={`rounded-2xl border p-4 transition-colors ${overLimit ? 'border-red-200 bg-red-50/40' : 'border-slate-200 bg-white'}`}>
                        <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-4 items-center">

                          {/* Left: product selector */}
                          <div className="flex items-center gap-3 w-full">
                            <span className="h-7 w-7 shrink-0 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold flex items-center justify-center">
                              {index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <ProductCombobox
                                value={pid}
                                onChange={id => {
                                  setValue(`items.${index}.productId`, id, { shouldValidate: true });
                                  setValue(`items.${index}.quantity`, 1);
                                }}
                                options={availableOptions}
                                disabled={isLoadingSourceStocks}
                                hasError={!!errors.items?.[index]?.productId}
                              />
                              {errors.items?.[index]?.productId && (
                                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                                  <LuTriangleAlert className="h-3 w-3 shrink-0" />
                                  {errors.items[index]?.productId?.message}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right: current / qty / available */}
                          <div className="grid grid-cols-[1fr_120px_1fr_auto] gap-3 items-center lg:pl-6 lg:border-l lg:border-slate-200 w-full">
                            <div className="text-center min-w-0">
                              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-0.5">Available</p>
                              <p className={`text-base font-bold truncate ${!pid ? 'text-slate-200' : availQty === 0 ? 'text-red-500' : availQty <= 5 ? 'text-amber-500' : 'text-slate-700'}`}>
                                {pid ? availQty : '—'}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1 text-center">Transfer Qty</p>
                              <input
                                type="number" min={1} max={availQty || undefined}
                                disabled={!pid}
                                {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                                className={`w-full h-10 text-center font-bold text-sm rounded-xl border outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed
                                  ${overLimit
                                    ? 'border-red-300 bg-red-50 text-red-700 focus:ring-4 focus:ring-red-100'
                                    : 'border-slate-200 bg-white text-emerald-700 focus:border-primary/60 focus:ring-4 focus:ring-primary/10'
                                  }`}
                              />
                            </div>

                            <div className="text-center min-w-0">
                              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-0.5">After</p>
                              <p className={`text-base font-bold truncate ${!pid ? 'text-slate-200' : overLimit ? 'text-red-600' : 'text-primary'}`}>
                                {pid
                                  ? overLimit
                                    ? <span className="flex items-center justify-center gap-1"><LuTriangleAlert className="h-3.5 w-3.5 shrink-0" />{String(availQty - qty)}</span>
                                    : String(availQty - qty)
                                  : '—'}
                              </p>
                            </div>

                            <button type="button" disabled={fields.length === 1}
                              onClick={() => fields.length > 1 && remove(index)}
                              className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${fields.length === 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}>
                              <LuTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {overLimit && (
                          <p className="mt-2 pl-9 text-[11px] font-medium text-red-600 flex items-center gap-1">
                            <LuTriangleAlert className="h-3 w-3" /> Exceeds available stock ({availQty}). Reduce quantity.
                          </p>
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

          {/* ── Section 3: Notes ── */}
          <Card className="p-5 sm:p-6 border border-slate-200 shadow-sm">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">
                Notes <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea rows={3} placeholder="Reason for transfer, special handling instructions…"
                {...register('notes')}
                className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-xl outline-none px-3.5 py-2.5 focus:border-primary/60 focus:ring-4 focus:ring-primary/10 resize-none placeholder:text-slate-400 transition-all" />
            </div>
          </Card>
        </div>

        {/* ══ RIGHT COLUMN — sticky summary + actions ══════════════════════════ */}
        <div className="lg:sticky lg:top-6 space-y-4">
          <Card className="p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-7 w-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                <LuClipboardList className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-semibold text-slate-800">Summary</h3>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-500 shrink-0">From</span>
                <span className={`font-semibold text-right ${sourceName ? 'text-slate-800' : 'text-slate-300'}`}>
                  {sourceName || 'Not set'}
                </span>
              </div>
              <div className="flex items-center justify-center -my-1">
                <LuArrowRight className="h-4 w-4 text-slate-300" />
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-500 shrink-0">To</span>
                <span className={`font-semibold text-right ${destName ? 'text-slate-800' : 'text-slate-300'}`}>
                  {destName || 'Not set'}
                </span>
              </div>
              <div className="h-px bg-slate-100" />
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Product lines</span>
                <span className="font-semibold text-slate-800">{validItems.length} / {fields.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total units</span>
                <span className="font-bold text-primary">{totalUnits}</span>
              </div>
            </div>

            {overLimitCount > 0 && (
              <div className="mt-4 flex items-start gap-2 text-xs font-medium text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">
                <LuTriangleAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {overLimitCount} line{overLimitCount > 1 ? 's' : ''} exceed{overLimitCount === 1 ? 's' : ''} available stock. Fix before saving.
              </div>
            )}
          </Card>

          <Card className="p-4 border border-slate-200 shadow-sm -space-y-2">
            <Button type="submit" disabled={isPending || !canSubmit}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2">
              {isPending && <LuRefreshCw className="animate-spin h-4 w-4" />}
              {isEdit ? 'Update draft' : 'Save as draft'}
            </Button>
            <Button type="button" variant="outline"
              onClick={() => router.push('/inventory/transfers')}
              className="w-full h-11 text-sm font-semibold rounded-xl">
              Discard
            </Button>
            {!canSubmit && !isPending && (
              <p className="text-[11px] text-slate-400 text-center pt-1">
                {!watchedSourceId || !watchedDestId
                  ? 'Set source and destination to continue'
                  : overLimitCount > 0
                    ? 'Fix over-limit quantities first'
                    : 'Add at least one product with a quantity'}
              </p>
            )}
          </Card>
        </div>

      </form>
    </div>
  );
}
