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
  LuSearch,
  LuPlus,
  LuTrash2,
  LuRefreshCw,
  LuChevronDown,
  LuCheck,
  LuX,
  LuBoxes,
  LuMapPin,
  LuArrowLeft,
  LuClipboardList,
  LuPackageOpen,
  LuCalendar,
  LuUser,
} from 'react-icons/lu';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ─── Schema ───────────────────────────────────────────────────────────────────
const grnItemSchema = zod.object({
  productId: zod.string().min(1, 'Product is required'),
  quantityOrdered: zod.number().min(0).default(0),
  quantityReceived: zod.number().min(1, 'Must be ≥ 1'),
  quantityAccepted: zod.number().min(0),
  quantityRejected: zod.number().min(0).default(0),
  unitPrice: zod.number().min(0),
  batchNumber: zod.string().optional(),
  expiryDate: zod.string().optional(),
});

export const grnFormSchema = zod.object({
  purchaseOrderId: zod.string().optional(),
  supplierId: zod.coerce.number().min(1, 'Supplier is required'),
  locationId: zod.string().min(1, 'Location is required'),
  receiveDate: zod.string().min(1, 'Receive date is required'),
  billNumber: zod.string().optional(),
  billAmount: zod.coerce.number().optional(),
  notes: zod.string().optional(),
  items: zod.array(grnItemSchema).min(1, 'At least one item is required'),
});

export type GRNFormValues = zod.infer<typeof grnFormSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

// ─── ProductCombobox ──────────────────────────────────────────────────────────
function ProductCombobox({
  value,
  onChange,
  options,
  placeholder = 'Select a product…',
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
  const [style, setStyle] = useState<React.CSSProperties>({});

  const selected = options.find((o) => o.id === value);
  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.sku || '').toLowerCase().includes(q),
    );
  }, [search, options]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || dropdownRef.current?.contains(t)) return;
      setOpen(false);
      setSearch('');
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  const handleOpen = () => {
    if (disabled) return;
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      const up = below < 300 && r.top > below;
      setStyle(
        up
          ? {
              position: 'fixed',
              bottom: window.innerHeight - r.top + 4,
              left: r.left,
              width: Math.max(r.width, 280),
              zIndex: 9999,
            }
          : {
              position: 'fixed',
              top: r.bottom + 4,
              left: r.left,
              width: Math.max(r.width, 280),
              zIndex: 9999,
            },
      );
    }
    setOpen((o) => !o);
    setSearch('');
  };

  return (
    <div ref={ref} className='relative w-full min-w-0'>
      <button
        ref={triggerRef}
        type='button'
        disabled={disabled}
        onClick={handleOpen}
        className={`w-full flex items-center justify-between gap-2 h-9 px-3 rounded-lg border text-sm text-left transition-all overflow-hidden
          ${
            disabled
              ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
              : open
                ? 'border-primary ring-4 ring-primary/10 bg-white'
                : hasError
                  ? 'border-red-300 bg-red-50/40'
                  : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
      >
        {selected ? (
          <span className='min-w-0 flex-1 flex items-center gap-1.5 overflow-hidden'>
            <span className='block truncate font-medium text-slate-800 text-xs max-w-[120px]'>
              {selected.name}
            </span>
            <span className='text-[10px] font-mono text-slate-400 shrink-0 bg-slate-100 px-1 py-0.5 rounded'>
              {selected.sku || '—'}
            </span>
          </span>
        ) : (
          <span className='text-slate-400 text-xs truncate'>{placeholder}</span>
        )}
        <div className='flex items-center gap-1 shrink-0'>
          {selected && !disabled && (
            <span
              role='button'
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setOpen(false);
                setSearch('');
              }}
              className='p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50'
            >
              <LuX className='h-3 w-3' />
            </span>
          )}
          <LuChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {open &&
        typeof document !== 'undefined' &&
        ReactDOM.createPortal(
          <div
            ref={dropdownRef}
            style={style}
            className='bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden'
          >
            <div className='p-2 border-b border-slate-100 bg-slate-50'>
              <div className='flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 h-9 focus-within:border-primary/60'>
                <LuSearch className='h-3.5 w-3.5 text-slate-400 shrink-0' />
                <input
                  ref={inputRef}
                  type='text'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder='Search by name or SKU…'
                  className='flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder:text-slate-400'
                />
                {search && (
                  <button
                    type='button'
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setSearch('')}
                    className='text-slate-400 hover:text-slate-600'
                  >
                    <LuX className='h-3 w-3' />
                  </button>
                )}
              </div>
            </div>
            <div
              className='max-h-56 overflow-y-auto p-1'
              onMouseDown={(e) => e.preventDefault()}
            >
              {filtered.length === 0 ? (
                <div className='py-8 text-center'>
                  <LuBoxes className='h-7 w-7 text-slate-300 mx-auto mb-2' />
                  <p className='text-sm text-slate-400'>No products found</p>
                </div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.id}
                    type='button'
                    onClick={() => {
                      onChange(opt.id);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left transition-colors
                      ${value === opt.id ? 'bg-primary/5' : 'hover:bg-slate-50'}`}
                  >
                    <div className='min-w-0'>
                      <p
                        className={`text-sm font-medium truncate ${value === opt.id ? 'text-primary' : 'text-slate-800'}`}
                      >
                        {opt.name}
                      </p>
                      <p className='text-[11px] font-mono text-slate-400'>
                        {opt.sku || '—'}
                      </p>
                    </div>
                    {value === opt.id && (
                      <LuCheck className='h-4 w-4 text-primary shrink-0' />
                    )}
                  </button>
                ))
              )}
            </div>
            <div className='px-3 py-1.5 border-t border-slate-100 bg-slate-50'>
              <p className='text-[10px] text-slate-400'>
                {filtered.length} product{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

// ─── Default item ─────────────────────────────────────────────────────────────
const DEFAULT_ITEM = {
  productId: '',
  quantityOrdered: 0,
  quantityReceived: 1,
  quantityAccepted: 1,
  quantityRejected: 0,
  unitPrice: 0,
  batchNumber: '',
  expiryDate: '',
};

// ─── Main Form ────────────────────────────────────────────────────────────────
export default function GRNForm() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<GRNFormValues>({
    resolver: zodResolver(grnFormSchema) as any,
    defaultValues: {
      purchaseOrderId: '',
      supplierId: 0,
      locationId: '',
      receiveDate: new Date().toISOString().substring(0, 10),
      billNumber: '',
      billAmount: 0,
      notes: '',
      items: [{ ...DEFAULT_ITEM }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = useWatch({ control, name: 'items' });
  const watchedPOId = watch('purchaseOrderId');

  // ─── Queries ──────────────────────────────────────────────────────────────────
  const { data: suppliersRes } = useQuery({
    queryKey: ['grn-form', 'suppliers'],
    queryFn: async () =>
      (await apiClient.get<ApiResponse<any[]>>('/suppliers/get-all')).data.data,
  });

  const { data: locationsRes } = useQuery({
    queryKey: ['grn-form', 'locations'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<any[]>>(
        '/stocks/locations/get-all',
      );
      return (res.data.data || []).filter((l: any) => l.status === 'ACTIVE');
    },
  });

  const { data: productsRes } = useQuery({
    queryKey: ['grn-form', 'products'],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>('/products/get-all');
      const d = r.data.data;
      return Array.isArray(d) ? d : (d as any)?.data || [];
    },
  });

  const { data: approvedPOsRes } = useQuery({
    queryKey: ['grn-form', 'approved-pos'],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>(
        '/purchase-orders/get-all-paginated',
        { params: { limit: 100, status: 'APPROVED' } },
      );
      const payload = r.data.data;
      return Array.isArray(payload) ? payload : (payload as any)?.data || [];
    },
  });

  const productOptions: ProductOption[] = useMemo(
    () =>
      (productsRes ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku ?? '—',
      })),
    [productsRes],
  );

  // Auto-fill from PO selection
  useEffect(() => {
    if (!watchedPOId) return;
    const po = approvedPOsRes?.find((p: any) => p.id === watchedPOId);
    if (!po) return;
    setValue('supplierId', po.supplierId);
    setValue('locationId', po.locationId);
    apiClient
      .get<ApiResponse<any>>(`/purchase-orders/get/${watchedPOId}`)
      .then((res) => {
        const details = res.data.data;
        if (details?.items?.length) {
          setValue(
            'items',
            details.items.map((item: any) => ({
              productId: item.productId,
              quantityOrdered: item.quantity,
              quantityReceived: item.quantity - (item.receivedQuantity || 0),
              quantityAccepted: item.quantity - (item.receivedQuantity || 0),
              quantityRejected: 0,
              unitPrice: item.unitPrice,
              batchNumber: '',
              expiryDate: '',
            })),
          );
        }
      });
  }, [watchedPOId, approvedPOsRes, setValue]);

  // ─── Mutation ─────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: GRNFormValues) =>
      apiClient.post<ApiResponse<any>>('/goods-receives/create', payload),
    onSuccess: () => {
      toast.success('GRN created — stock levels updated');
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      router.push('/inventory/grn');
    },
    onError: (err: any) => {
      const res = err?.response?.data;
      // Handle Zod validation errors returned in errors[] array
      if (res?.errors?.length) {
        const first = res.errors[0];
        const field = first.field ? ` (${first.field})` : '';
        toast.error(`${first.message}${field}`, { duration: 5000 });
        return;
      }
      // Fallback to message field
      const message = res?.message;
      if (message && typeof message === 'string') {
        try {
          const parsed = JSON.parse(message);
          if (Array.isArray(parsed) && parsed.length > 0) {
            toast.error(parsed[0].message, { duration: 5000 });
            return;
          }
        } catch {
          /* not JSON */
        }
        toast.error(message);
        return;
      }
      toast.error('Failed to create GRN');
    },
  });

  const handleProductSelect = (index: number, productId: string) => {
    setValue(`items.${index}.productId`, productId, { shouldValidate: true });
    const p = productsRes?.find((x: any) => x.id === productId);
    if (p) {
      setValue(
        `items.${index}.unitPrice`,
        p.Baseprice ?? p.basePrice ?? p.finalPrice ?? 0,
      );
    }
  };

  // ─── Derived totals ───────────────────────────────────────────────────────────
  const subtotal = useMemo(
    () =>
      (watchedItems || []).reduce(
        (s, i) =>
          s + (Number(i.quantityAccepted) || 0) * (Number(i.unitPrice) || 0),
        0,
      ),
    [watchedItems],
  );

  const validItems = (watchedItems || []).filter(
    (i) => i.productId && Number(i.quantityReceived) >= 1,
  );
  const isPending = createMutation.isPending;
  const canSubmit = validItems.length > 0 && !isPending;

  return (
    <div className='space-y-5'>
      {/* ── Page header ── */}
      <div className='flex items-center gap-4 bg-white px-5 sm:px-6 py-5 rounded-xl border border-slate-200 shadow-sm'>
        <button
          type='button'
          onClick={() => router.push('/inventory/grn')}
          className='flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors shrink-0'
        >
          <LuArrowLeft className='h-4 w-4' />
        </button>
        <div className='min-w-0'>
          <h1 className='text-lg sm:text-xl font-bold text-slate-900'>
            New Goods Receive Note
          </h1>
          <p className='text-xs text-slate-500 mt-0.5'>
            Fill in receipt details and items, then confirm to update stock.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit((v) => createMutation.mutate(v))}
        className='grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start'
      >
        {/* ══ LEFT COLUMN ══ */}
        <div className='space-y-5 min-w-0'>
          {/* ── Section 1: Receipt Details ── */}
          <Card className='p-5 sm:p-6 border border-slate-200 shadow-sm'>
            <div className='flex items-center gap-2 mb-4'>
              <span className='h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0'>
                <LuMapPin className='h-3.5 w-3.5' />
              </span>
              <h3 className='text-sm font-semibold text-slate-800'>
                Receipt Details
              </h3>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              {/* Link PO */}
              <div className='sm:col-span-2 space-y-1.5'>
                <label className='text-xs font-semibold text-slate-600 flex items-center gap-1.5'>
                  <LuClipboardList className='h-3.5 w-3.5' /> Link Approved PO{' '}
                  <span className='font-normal text-slate-400'>(optional)</span>
                </label>
                <select
                  {...register('purchaseOrderId')}
                  className='w-full h-11 bg-white border border-slate-200 text-slate-800 text-sm rounded-xl outline-none px-3.5 focus:border-primary/60 focus:ring-4 focus:ring-primary/10 transition-all'
                >
                  <option value=''>No PO (Direct In)</option>
                  {approvedPOsRes?.map((po: any) => (
                    <option key={po.id} value={po.id}>
                      {po.poNumber} — {po.supplier?.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier */}
              <div className='space-y-1.5'>
                <label className='text-xs font-semibold text-slate-600 flex items-center gap-1.5'>
                  <LuUser className='h-3.5 w-3.5' /> Supplier *
                </label>
                <select
                  {...register('supplierId')}
                  disabled={!!watchedPOId}
                  className={`w-full h-11 bg-white border text-slate-800 text-sm rounded-xl outline-none px-3.5 focus:ring-4 focus:ring-primary/10 transition-all disabled:opacity-60 disabled:bg-slate-50
                    ${errors.supplierId ? 'border-red-300' : 'border-slate-200 focus:border-primary/60'}`}
                >
                  <option value={0}>Select supplier…</option>
                  {suppliersRes?.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {errors.supplierId && (
                  <p className='text-red-500 text-[11px]'>
                    {errors.supplierId.message}
                  </p>
                )}
              </div>

              {/* Location */}
              <div className='space-y-1.5'>
                <label className='text-xs font-semibold text-slate-600 flex items-center gap-1.5'>
                  <LuMapPin className='h-3.5 w-3.5' /> Receive Location *
                </label>
                <select
                  {...register('locationId')}
                  disabled={!!watchedPOId}
                  className={`w-full h-11 bg-white border text-slate-800 text-sm rounded-xl outline-none px-3.5 focus:ring-4 focus:ring-primary/10 transition-all disabled:opacity-60 disabled:bg-slate-50
                    ${errors.locationId ? 'border-red-300' : 'border-slate-200 focus:border-primary/60'}`}
                >
                  <option value=''>Select location…</option>
                  {locationsRes?.map((l: any) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
                {errors.locationId && (
                  <p className='text-red-500 text-[11px]'>
                    {errors.locationId.message}
                  </p>
                )}
              </div>

              {/* Receive Date */}
              <div className='space-y-1.5'>
                <label className='text-xs font-semibold text-slate-600 flex items-center gap-1.5'>
                  <LuCalendar className='h-3.5 w-3.5' /> Receive Date *
                </label>
                <input
                  type='date'
                  {...register('receiveDate')}
                  className={`w-full h-11 bg-white border text-slate-800 text-sm rounded-xl outline-none px-3.5 focus:ring-4 focus:ring-primary/10 transition-all
                    ${errors.receiveDate ? 'border-red-300' : 'border-slate-200 focus:border-primary/60'}`}
                />
                {errors.receiveDate && (
                  <p className='text-red-500 text-[11px]'>
                    {errors.receiveDate.message}
                  </p>
                )}
              </div>

              {/* Bill Number */}
              <div className='space-y-1.5'>
                <label className='text-xs font-semibold text-slate-600 block'>
                  Bill / Invoice No.{' '}
                  <span className='font-normal text-slate-400'>(optional)</span>
                </label>
                <input
                  type='text'
                  placeholder='e.g. INV-9871'
                  {...register('billNumber')}
                  className='w-full h-11 bg-white border border-slate-200 text-slate-800 text-sm rounded-xl outline-none px-3.5 focus:border-primary/60 focus:ring-4 focus:ring-primary/10 transition-all'
                />
              </div>

              {/* Bill Amount */}
              <div className='space-y-1.5'>
                <label className='text-xs font-semibold text-slate-600 block'>
                  Bill Amount{' '}
                  <span className='font-normal text-slate-400'>(optional)</span>
                </label>
                <input
                  type='number'
                  step='0.01'
                  placeholder='0.00'
                  {...register('billAmount', { valueAsNumber: true })}
                  className='w-full h-11 bg-white border border-slate-200 text-slate-800 text-sm rounded-xl outline-none px-3.5 focus:border-primary/60 focus:ring-4 focus:ring-primary/10 transition-all'
                />
              </div>
            </div>
          </Card>

          {/* ── Section 2: Items ── */}
          <Card className='border border-slate-200 shadow-sm overflow-hidden'>
            <div className='flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100'>
              <div className='flex items-center gap-2'>
                <span className='h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0'>
                  <LuBoxes className='h-3.5 w-3.5' />
                </span>
                <h3 className='text-sm font-semibold text-slate-800'>
                  Received Items
                </h3>
                {fields.length > 0 && (
                  <span className='text-[11px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full'>
                    {fields.length}
                  </span>
                )}
              </div>
            </div>

            <div className='p-4 sm:p-5 space-y-3'>
              {fields.map((field, index) => {
                const hasProduct = !!watchedItems?.[index]?.productId;
                const inputCls = `h-9 text-center bg-white border border-slate-200 text-slate-800 text-xs rounded-lg outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50`;
                return (
                  <div
                    key={field.id}
                    className='border border-slate-200 rounded-xl p-3 bg-white hover:bg-slate-50/40 transition-colors'
                  >
                    <input
                      type='hidden'
                      {...register(`items.${index}.productId` as const)}
                    />

                    {/* Line 1: Product + Unit Price */}
                    <div className='grid grid-cols-[1fr_auto] gap-3 mb-3'>
                      <div className='min-w-0'>
                        <label className='text-[10px] font-semibold text-slate-500 uppercase mb-1.5 block'>
                          Product *
                        </label>
                        <ProductCombobox
                          value={watchedItems?.[index]?.productId ?? ''}
                          onChange={(id) => handleProductSelect(index, id)}
                          options={productOptions}
                          hasError={!!errors.items?.[index]?.productId}
                        />
                      </div>
                      <div className='w-28'>
                        <label className='text-[10px] font-semibold text-slate-500 uppercase mb-1.5 block'>
                          Unit Price
                        </label>
                        <input
                          type='number'
                          min={0}
                          step='0.01'
                          disabled={!hasProduct}
                          {...register(`items.${index}.unitPrice` as const, {
                            valueAsNumber: true,
                          })}
                          className={`w-full ${inputCls}`}
                        />
                      </div>
                    </div>

                    {/* Line 2: Quantities + Batch + Expiry + Delete */}
                    <div className='grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 items-end'>
                      <div>
                        <label className='text-[10px] font-semibold text-slate-500 uppercase mb-1 block'>
                          Ordered
                        </label>
                        <input
                          type='number'
                          min={0}
                          disabled={!hasProduct}
                          {...register(
                            `items.${index}.quantityOrdered` as const,
                            { valueAsNumber: true },
                          )}
                          className={`w-full ${inputCls}`}
                        />
                      </div>
                      <div>
                        <label className='text-[10px] font-semibold text-slate-500 uppercase mb-1 block'>
                          Received
                        </label>
                        <input
                          type='number'
                          min={1}
                          disabled={!hasProduct}
                          {...register(
                            `items.${index}.quantityReceived` as const,
                            { valueAsNumber: true },
                          )}
                          className={`w-full ${inputCls} ${errors.items?.[index]?.quantityReceived ? 'border-red-400' : ''}`}
                        />
                      </div>
                      <div>
                        <label className='text-[10px] font-semibold text-slate-500 uppercase mb-1 block'>
                          Accepted
                        </label>
                        <input
                          type='number'
                          min={0}
                          disabled={!hasProduct}
                          {...register(
                            `items.${index}.quantityAccepted` as const,
                            { valueAsNumber: true },
                          )}
                          className={`w-full ${inputCls}`}
                        />
                      </div>
                      <div>
                        <label className='text-[10px] font-semibold text-slate-500 uppercase mb-1 block'>
                          Rejected
                        </label>
                        <input
                          type='number'
                          min={0}
                          disabled={!hasProduct}
                          {...register(
                            `items.${index}.quantityRejected` as const,
                            { valueAsNumber: true },
                          )}
                          className={`w-full ${inputCls}`}
                        />
                      </div>
                      <div className='sm:col-span-2'>
                        <label className='text-[10px] font-semibold text-slate-500 uppercase mb-1 block'>
                          Batch #
                        </label>
                        <input
                          type='text'
                          placeholder='Optional'
                          disabled={!hasProduct}
                          {...register(`items.${index}.batchNumber` as const)}
                          className={`w-full h-9 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg outline-none px-2 focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all disabled:opacity-50 disabled:bg-slate-50`}
                        />
                      </div>
                      <div className='sm:col-span-2'>
                        <label className='text-[10px] font-semibold text-slate-500 uppercase mb-1 block'>
                          Expiry Date
                        </label>
                        <input
                          type='date'
                          disabled={!hasProduct}
                          {...register(`items.${index}.expiryDate` as const)}
                          className={`w-full h-9 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg outline-none px-2 focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all disabled:opacity-50 disabled:bg-slate-50`}
                        />
                      </div>
                      {fields.length > 1 && !watchedPOId && (
                        <div className='flex items-end justify-center sm:col-span-2 lg:col-span-1'>
                          <button
                            type='button'
                            onClick={() => remove(index)}
                            className='h-9 w-full sm:w-9 rounded-lg flex items-center justify-center transition-colors text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-200 hover:border-red-200'
                          >
                            <LuTrash2 className='h-3.5 w-3.5' />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {errors.items && !Array.isArray(errors.items) && (
                <p className='text-xs text-red-500 flex items-center gap-1'>
                  {errors.items.message as string}
                </p>
              )}
              {!watchedPOId && (
                <div className='flex justify-end'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => append({ ...DEFAULT_ITEM })}
                    className='text-xs h-9 border-dashed border-primary/40 text-primary hover:bg-primary/5 font-semibold px-6'
                  >
                    <LuPlus className='h-3.5 w-3.5 mr-1.5' /> Add Product
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* ── Section 3: Notes ── */}
          <Card className='p-5 sm:p-6 border border-slate-200 shadow-sm'>
            <div className='space-y-1.5'>
              <label className='text-xs font-semibold text-slate-600 block'>
                Notes{' '}
                <span className='font-normal text-slate-400'>(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder='Any notes about this delivery…'
                {...register('notes')}
                className='w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-xl outline-none px-3.5 py-2.5 focus:border-primary/60 focus:ring-4 focus:ring-primary/10 resize-none placeholder:text-slate-400 transition-all'
              />
            </div>
          </Card>
        </div>

        {/* ══ RIGHT COLUMN — sticky summary ══ */}
        <div className='lg:sticky lg:top-6 space-y-4'>
          <Card className='p-5 border border-slate-200 shadow-sm'>
            <div className='flex items-center gap-2 mb-4'>
              <span className='h-7 w-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0'>
                <LuClipboardList className='h-3.5 w-3.5' />
              </span>
              <h3 className='text-sm font-semibold text-slate-800'>Summary</h3>
            </div>
            <div className='space-y-2.5 text-sm'>
              <div className='flex items-center justify-between'>
                <span className='text-slate-500'>Items</span>
                <span className='font-semibold text-slate-800'>
                  {validItems.length} / {fields.length}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-slate-500'>Total Received</span>
                <span className='font-semibold text-slate-800'>
                  {(watchedItems || []).reduce(
                    (s, i) => s + (Number(i.quantityReceived) || 0),
                    0,
                  )}{' '}
                  units
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-slate-500'>Total Accepted</span>
                <span className='font-semibold text-emerald-600'>
                  {(watchedItems || []).reduce(
                    (s, i) => s + (Number(i.quantityAccepted) || 0),
                    0,
                  )}{' '}
                  units
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-slate-500'>Total Rejected</span>
                <span className='font-semibold text-red-500'>
                  {(watchedItems || []).reduce(
                    (s, i) => s + (Number(i.quantityRejected) || 0),
                    0,
                  )}{' '}
                  units
                </span>
              </div>
              <div className='h-px bg-slate-100' />
              <div className='flex items-center justify-between'>
                <span className='font-semibold text-slate-700'>Subtotal</span>
                <span className='font-bold text-primary text-base'>
                  ৳{subtotal.toFixed(2)}
                </span>
              </div>
            </div>
          </Card>

          <Card className='p-4 border border-slate-200 shadow-sm'>
            <div className='flex flex-col gap-2'>
              <Button
                type='submit'
                disabled={!canSubmit}
                className='w-full h-10 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2'
              >
                {isPending && <LuRefreshCw className='animate-spin h-4 w-4' />}
                <LuPackageOpen className='h-4 w-4' />
                Confirm & Receive
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => router.push('/inventory/grn')}
                className='w-full h-10 text-sm font-semibold rounded-xl'
              >
                Discard
              </Button>
            </div>
            {!canSubmit && !isPending && (
              <p className='text-[11px] text-slate-400 text-center mt-2'>
                Add at least one product with received qty ≥ 1
              </p>
            )}
          </Card>
        </div>
      </form>
    </div>
  );
}
