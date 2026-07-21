'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
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
  LuShoppingCart,
  LuCalendar,
  LuUser,
} from 'react-icons/lu';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ─── Schema ───────────────────────────────────────────────────────────────────
const poItemSchema = zod.object({
  productId: zod.string().min(1, 'Product is required'),
  quantity: zod.number().min(1, 'At least 1'),
  unitPrice: zod.number().min(0, 'Must be non-negative'),
  taxPercent: zod.number().min(0).max(100).default(0),
  discountPercent: zod.number().min(0).max(100).default(0),
});

export const purchaseOrderFormSchema = zod.object({
  supplierId: zod.coerce.number().min(1, 'Supplier is required'),
  locationId: zod.string().min(1, 'Location is required'),
  orderDate: zod.string().min(1, 'Order date is required'),
  expectedDate: zod.string().optional(),
  notes: zod.string().optional(),
  items: zod.array(poItemSchema).min(1, 'At least one item is required'),
});

export type PurchaseOrderFormValues = zod.infer<typeof purchaseOrderFormSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface POItem {
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

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: number;
  supplier: { name: string; companyName: string };
  locationId: string;
  location: { name: string };
  orderDate: string;
  expectedDate?: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'CANCELLED';
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  netAmount: number;
  notes?: string;
  createdAt: string;
  items: POItem[];
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

// ─── Product Combobox ─────────────────────────────────────────────────────────
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
              width: Math.max(r.width, 300),
              zIndex: 9999,
            }
          : {
              position: 'fixed',
              top: r.bottom + 4,
              left: r.left,
              width: Math.max(r.width, 300),
              zIndex: 9999,
            },
      );
    }
    setOpen((o) => !o);
    setSearch('');
  };

  return (
    <div
      ref={ref}
      className='relative w-full min-w-0'
      style={{ maxWidth: '100%' }}
    >
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
            <span className='text-[10px] font-mono text-slate-400 shrink-0 bg-slate-100 px-1 py-0.5 rounded truncate max-w-[60px]'>
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
              className='p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50'
            >
              <LuX className='h-3.5 w-3.5' />
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
              className='max-h-60 overflow-y-auto p-1'
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

// ─── Main Form ────────────────────────────────────────────────────────────────
interface PurchaseOrderFormProps {
  editingPO?: PurchaseOrder | null;
}

export default function PurchaseOrderForm({
  editingPO,
}: PurchaseOrderFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!editingPO;

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
      locationId: '',
      orderDate: new Date().toISOString().substring(0, 10),
      expectedDate: '',
      notes: '',
      items: [
        {
          productId: '',
          quantity: 1,
          unitPrice: 0,
          taxPercent: 0,
          discountPercent: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = useWatch({ control, name: 'items' });

  const searchParams = useSearchParams();
  const [paramsParsed, setParamsParsed] = useState(false);

  // Pre-fill when editing
  useEffect(() => {
    if (editingPO) {
      const arr = Array.isArray(editingPO.items) ? editingPO.items : [];
      reset({
        supplierId: editingPO.supplierId,
        locationId: editingPO.locationId,
        orderDate: new Date(editingPO.orderDate).toISOString().substring(0, 10),
        expectedDate: editingPO.expectedDate
          ? new Date(editingPO.expectedDate).toISOString().substring(0, 10)
          : '',
        notes: editingPO.notes || '',
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
                  productId: '',
                  quantity: 1,
                  unitPrice: 0,
                  taxPercent: 0,
                  discountPercent: 0,
                },
              ],
      });
    }
  }, [editingPO, reset]);

  // ─── Queries ──────────────────────────────────────────────────────────────────
  const { data: suppliersRes } = useQuery({
    queryKey: ['po-form', 'suppliers'],
    queryFn: async () =>
      (await apiClient.get<ApiResponse<any[]>>('/suppliers/get-all')).data.data,
  });

  const { data: locationsRes } = useQuery({
    queryKey: ['po-form', 'locations'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<any[]>>(
        '/stocks/locations/get-all',
      );
      return (res.data.data || []).filter((l: any) => l.status === 'ACTIVE');
    },
  });

  const { data: productsRes } = useQuery({
    queryKey: ['po-form', 'products'],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>('/products/get-all');
      const data = r.data.data;
      return Array.isArray(data) ? data : (data as any)?.data || [];
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

  // Pre-fill from query parameters when not editing and products list loads
  useEffect(() => {
    if (!editingPO && !paramsParsed && productsRes && productsRes.length > 0) {
      const locationId = searchParams.get('locationId') || '';
      const itemsStr = searchParams.get('items');
      if (locationId || itemsStr) {
        let items = [
          {
            productId: '',
            quantity: 1,
            unitPrice: 0,
            taxPercent: 0,
            discountPercent: 0,
          },
        ];
        if (itemsStr) {
          try {
            const parsed = JSON.parse(itemsStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
              items = parsed.map((i: any) => {
                const prod = productsRes.find((p: any) => p.id === i.productId);
                const defaultPrice = prod
                  ? (prod.Baseprice ?? prod.basePrice ?? prod.finalPrice ?? 0)
                  : 0;
                return {
                  productId: i.productId || '',
                  quantity: Number(i.quantity) || 1,
                  unitPrice: Number(i.unitPrice) || defaultPrice,
                  taxPercent: Number(i.taxPercent) || 0,
                  discountPercent: Number(i.discountPercent) || 0,
                };
              });
            }
          } catch (e) {
            console.error('Failed to parse items from query', e);
          }
        }
        reset({
          supplierId: 0,
          locationId: locationId,
          orderDate: new Date().toISOString().substring(0, 10),
          expectedDate: '',
          notes: 'Generated from Low Stock Alert.',
          items: items,
        });
        setParamsParsed(true);
      }
    }
  }, [editingPO, searchParams, productsRes, reset, paramsParsed]);

  // ─── Mutations ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: PurchaseOrderFormValues) =>
      apiClient.post<ApiResponse<any>>('/purchase-orders/create', payload),
    onSuccess: () => {
      toast.success('Purchase Order created as draft');
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      router.push('/inventory/purchases');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to create PO'),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: PurchaseOrderFormValues;
    }) =>
      apiClient.patch<ApiResponse<any>>(
        `/purchase-orders/update/${id}`,
        payload,
      ),
    onSuccess: () => {
      toast.success('Purchase Order updated');
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      router.push('/inventory/purchases');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to update PO'),
  });

  const onSubmit = (values: PurchaseOrderFormValues) => {
    if (isEdit && editingPO)
      updateMutation.mutate({ id: editingPO.id, payload: values });
    else createMutation.mutate(values);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // ─── Derived totals ───────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    let subtotal = 0,
      tax = 0,
      discount = 0;
    (watchedItems || []).forEach((item) => {
      const q = Number(item.quantity) || 0;
      const p = Number(item.unitPrice) || 0;
      const base = q * p;
      const disc = base * ((Number(item.discountPercent) || 0) / 100);
      const taxAmt = (base - disc) * ((Number(item.taxPercent) || 0) / 100);
      subtotal += base;
      discount += disc;
      tax += taxAmt;
    });
    return { subtotal, tax, discount, net: subtotal - discount + tax };
  }, [watchedItems]);

  const validItems = (watchedItems || []).filter(
    (i) => i.productId && Number(i.quantity) > 0,
  );
  const canSubmit = validItems.length > 0 && !isPending;

  const handleProductSelect = (index: number, productId: string) => {
    const prod = productsRes?.find((p: any) => p.id === productId);
    if (prod) {
      setValue(
        `items.${index}.unitPrice`,
        prod.Baseprice ?? prod.basePrice ?? prod.finalPrice ?? 0,
        { shouldValidate: true },
      );
    }
  };

  return (
    <div className='space-y-5'>
      {/* ── Page header ── */}
      <div className='flex items-center gap-4 bg-white px-5 sm:px-6 py-5 rounded-xl border border-slate-200 shadow-sm'>
        <button
          type='button'
          onClick={() => router.push('/inventory/purchases')}
          className='flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors shrink-0'
        >
          <LuArrowLeft className='h-4 w-4' />
        </button>
        <div className='min-w-0'>
          <h1 className='text-lg sm:text-xl font-bold text-slate-900 truncate'>
            {isEdit ? `Edit — ${editingPO!.poNumber}` : 'New Purchase Order'}
          </h1>
          <p className='text-xs text-slate-500 mt-0.5'>
            {isEdit
              ? 'Update the draft order details and items.'
              : 'Saved as DRAFT — approve it to begin the GRN workflow.'}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className='grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start'
      >
        {/* ══ LEFT COLUMN ══════════════════════════════════════════════════════ */}
        <div className='space-y-5 min-w-0'>
          {/* ── Section 1: Order Details ── */}
          <Card className='p-5 sm:p-6 border border-slate-200 shadow-sm'>
            <div className='flex items-center gap-2 mb-4'>
              <span className='h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0'>
                <LuMapPin className='h-3.5 w-3.5' />
              </span>
              <h3 className='text-sm font-semibold text-slate-800'>
                Order Details
              </h3>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              {/* Supplier */}
              <div className='space-y-1.5'>
                <label className='text-xs font-semibold text-slate-600 flex items-center gap-1.5'>
                  <LuUser className='h-3.5 w-3.5' /> Supplier *
                </label>
                <select
                  {...register('supplierId')}
                  className={`w-full h-11 bg-white border text-slate-800 text-sm rounded-xl outline-none px-3.5 focus:ring-4 focus:ring-primary/10 transition-all
                    ${errors.supplierId ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-primary/60'}`}
                >
                  <option value={0}>Select supplier…</option>
                  {suppliersRes?.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {errors.supplierId && (
                  <p className='text-red-500 text-[11px] flex items-center gap-1'>
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
                  className={`w-full h-11 bg-white border text-slate-800 text-sm rounded-xl outline-none px-3.5 focus:ring-4 focus:ring-primary/10 transition-all
                    ${errors.locationId ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-primary/60'}`}
                >
                  <option value=''>Select location…</option>
                  {locationsRes?.map((l: any) => (
                    <option key={l.id} value={l.id}>
                      {l.name} — {l.code}
                    </option>
                  ))}
                </select>
                {errors.locationId && (
                  <p className='text-red-500 text-[11px]'>
                    {errors.locationId.message}
                  </p>
                )}
              </div>

              {/* Order Date */}
              <div className='space-y-1.5'>
                <label className='text-xs font-semibold text-slate-600 flex items-center gap-1.5'>
                  <LuCalendar className='h-3.5 w-3.5' /> Order Date *
                </label>
                <input
                  type='date'
                  {...register('orderDate')}
                  className={`w-full h-11 bg-white border text-slate-800 text-sm rounded-xl outline-none px-3.5 focus:ring-4 focus:ring-primary/10 transition-all
                    ${errors.orderDate ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-primary/60'}`}
                />
                {errors.orderDate && (
                  <p className='text-red-500 text-[11px]'>
                    {errors.orderDate.message}
                  </p>
                )}
              </div>

              {/* Expected Date */}
              <div className='space-y-1.5'>
                <label className='text-xs font-semibold text-slate-600 flex items-center gap-1.5'>
                  <LuCalendar className='h-3.5 w-3.5' /> Expected Date{' '}
                  <span className='font-normal text-slate-400'>(optional)</span>
                </label>
                <input
                  type='date'
                  {...register('expectedDate')}
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
                  Order Items
                </h3>
                {fields.length > 0 && (
                  <span className='text-[11px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full'>
                    {fields.length}
                  </span>
                )}
              </div>
            </div>

            <div className='p-4 sm:p-5'>
              <div className='rounded-xl border border-slate-200 overflow-hidden'>
                <div className='overflow-x-auto'>
                  <table className='w-full text-left text-xs min-w-[640px]'>
                    <thead className='bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase'>
                      <tr>
                        <th className='p-3 w-[250px] max-w-[250px]'>
                          Product *
                        </th>
                        <th className='p-3 text-center w-20'>Qty *</th>
                        <th className='p-3 text-center w-28'>Unit Cost *</th>
                        <th className='p-3 text-center w-20'>Tax %</th>
                        <th className='p-3 text-center w-20'>Disc %</th>
                        <th className='p-3 text-right w-28'>Line Total</th>
                        <th className='p-3 w-10'></th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100'>
                      {fields.map((field, index) => {
                        const q = Number(watchedItems?.[index]?.quantity) || 0;
                        const p = Number(watchedItems?.[index]?.unitPrice) || 0;
                        const disc =
                          Number(watchedItems?.[index]?.discountPercent) || 0;
                        const tax =
                          Number(watchedItems?.[index]?.taxPercent) || 0;
                        const base = q * p;
                        const lineTotal =
                          base -
                          base * (disc / 100) +
                          (base - base * (disc / 100)) * (tax / 100);

                        return (
                          <tr key={field.id} className='hover:bg-slate-50/60'>
                            <td className='p-2 w-[250px] max-w-[250px]'>
                              <input
                                type='hidden'
                                {...register(
                                  `items.${index}.productId` as const,
                                )}
                              />
                              <ProductCombobox
                                value={watchedItems?.[index]?.productId ?? ''}
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
                            <td className='p-2'>
                              <input
                                type='number'
                                min={1}
                                {...register(
                                  `items.${index}.quantity` as const,
                                  { valueAsNumber: true },
                                )}
                                className='w-full h-9 bg-white border border-slate-200 rounded-lg text-center text-xs outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all'
                              />
                            </td>
                            <td className='p-2'>
                              <input
                                type='number'
                                min={0}
                                step='0.01'
                                {...register(
                                  `items.${index}.unitPrice` as const,
                                  { valueAsNumber: true },
                                )}
                                className='w-full h-9 bg-white border border-slate-200 rounded-lg text-center text-xs outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all'
                              />
                            </td>
                            <td className='p-2'>
                              <input
                                type='number'
                                min={0}
                                max={100}
                                {...register(
                                  `items.${index}.taxPercent` as const,
                                  { valueAsNumber: true },
                                )}
                                className='w-full h-9 bg-white border border-slate-200 rounded-lg text-center text-xs outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all'
                              />
                            </td>
                            <td className='p-2'>
                              <input
                                type='number'
                                min={0}
                                max={100}
                                {...register(
                                  `items.${index}.discountPercent` as const,
                                  { valueAsNumber: true },
                                )}
                                className='w-full h-9 bg-white border border-slate-200 rounded-lg text-center text-xs outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all'
                              />
                            </td>
                            <td className='p-2 text-right font-bold text-slate-800 whitespace-nowrap pr-3'>
                              ৳{lineTotal.toFixed(2)}
                            </td>
                            <td className='p-2 text-center'>
                              <button
                                type='button'
                                disabled={fields.length === 1}
                                onClick={() =>
                                  fields.length > 1 && remove(index)
                                }
                                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors mx-auto
                                  ${fields.length === 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
                              >
                                <LuTrash2 className='h-3.5 w-3.5' />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {errors.items && !Array.isArray(errors.items) && (
                <p className='mt-2 text-xs text-red-500'>
                  {errors.items.message as string}
                </p>
              )}
              <div className='flex justify-end mt-3'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    append({
                      productId: '',
                      quantity: 1,
                      unitPrice: 0,
                      taxPercent: 0,
                      discountPercent: 0,
                    })
                  }
                  className='text-xs h-9 border-dashed border-primary/40 text-primary hover:bg-primary/5 font-semibold px-6'
                >
                  <LuPlus className='h-3.5 w-3.5 mr-1.5' /> Add Product
                </Button>
              </div>
            </div>
          </Card>

          {/* ── Section 3: Notes ── */}
          <Card className='p-5 sm:p-6 border border-slate-200 shadow-sm'>
            <div className='space-y-1.5'>
              <label className='text-xs font-semibold text-slate-600 block'>
                Internal Notes{' '}
                <span className='font-normal text-slate-400'>(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder='Shipping instructions, special conditions…'
                {...register('notes')}
                className='w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-xl outline-none px-3.5 py-2.5 focus:border-primary/60 focus:ring-4 focus:ring-primary/10 resize-none placeholder:text-slate-400 transition-all'
              />
            </div>
          </Card>
        </div>

        {/* ══ RIGHT COLUMN — sticky summary ════════════════════════════════════ */}
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
                <span className='text-slate-500'>Subtotal</span>
                <span className='font-semibold text-slate-800'>
                  ৳{totals.subtotal.toFixed(2)}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-slate-500'>Discount (−)</span>
                <span className='font-semibold text-red-500'>
                  ৳{totals.discount.toFixed(2)}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-slate-500'>Tax (+)</span>
                <span className='font-semibold text-emerald-600'>
                  ৳{totals.tax.toFixed(2)}
                </span>
              </div>
              <div className='h-px bg-slate-100' />
              <div className='flex items-center justify-between'>
                <span className='text-slate-500'>Items</span>
                <span className='font-semibold text-slate-800'>
                  {validItems.length} / {fields.length}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='font-semibold text-slate-700'>Net Total</span>
                <span className='font-bold text-primary text-base'>
                  ৳{totals.net.toFixed(2)}
                </span>
              </div>
            </div>
          </Card>

          <Card className='p-4 border border-slate-200 shadow-sm'>
            <div className='flex flex-col gap-2'>
              <Button
                type='submit'
                disabled={isPending || !canSubmit}
                className='w-full h-10 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2'
              >
                {isPending && <LuRefreshCw className='animate-spin h-4 w-4' />}
                {isEdit ? 'Update draft' : 'Place Order'}
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => router.push('/inventory/purchases')}
                className='w-full h-10 text-sm font-semibold rounded-xl'
              >
                Discard
              </Button>
            </div>
            {!canSubmit && !isPending && (
              <p className='text-[11px] text-slate-400 text-center mt-2'>
                Add at least one product with a quantity to continue
              </p>
            )}
          </Card>
        </div>
      </form>
    </div>
  );
}
