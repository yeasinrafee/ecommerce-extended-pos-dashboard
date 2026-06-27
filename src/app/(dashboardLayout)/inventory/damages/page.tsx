'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/auth';
import {
  LuSearch, LuPlus, LuTrash, LuEye, LuRefreshCw,
  LuChevronDown, LuCheck, LuX, LuBoxes, LuMapPin,
  LuCircleCheck, LuCircleX,
} from 'react-icons/lu';
import { toast } from 'react-hot-toast';
import Loader from '@/components/Common/Loader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { PaginationControl } from '@/components/Common/Pagination';
import DeleteModal from '@/components/Common/DeleteModal';
import { LucideAlertCircle, MoreHorizontal, Pencil } from 'lucide-react';

// ─── Schemas ──────────────────────────────────────────────────────────────────
const damageItemSchema = zod.object({
  productId: zod.string().min(1, 'Product is required'),
  quantity: zod.number().min(1, 'Quantity must be at least 1'),
  reason: zod.enum(['DAMAGED', 'BROKEN', 'LOST', 'EXPIRED']),
});

const damageFormSchema = zod.object({
  locationId: zod.string().min(1, 'Location is required'),
  notes: zod.string().optional(),
  items: zod.array(damageItemSchema).min(1, 'At least one item is required'),
});

type DamageFormValues = zod.infer<typeof damageFormSchema>;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface DamageItem {
  id: string;
  productId: string;
  quantity: number;
  reason: 'DAMAGED' | 'BROKEN' | 'LOST' | 'EXPIRED';
  product: { name: string; sku: string };
}

interface Damage {
  id: string;
  damageNumber: string;
  locationId: string;
  location: { name: string };
  damageDate: string;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdAt: string;
  items: DamageItem[];
  itemsCount?: number;      // may be returned by list API
  totalQuantity?: number;   // may be returned by list API
  _count?: { items: number };}

// ─── Product Combobox (portal, search, flip-up) ────────────────────────────────
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
          : open ? 'bg-white border-indigo-500 ring-2 ring-indigo-100'
          : hasError ? 'bg-white border-red-300' : 'bg-white border-slate-200 hover:border-slate-400'}`}>
        <button ref={triggerRef} type="button" disabled={disabled} onClick={handleOpen}
          className="flex items-center gap-2 min-w-0 flex-1 px-3 h-full text-left cursor-pointer disabled:cursor-not-allowed">
          {selected
            ? <><span className="font-medium text-slate-900 truncate text-xs">{selected.name}</span>
                <span className="font-mono text-[10px] text-slate-400 shrink-0 bg-slate-100 px-1 py-0.5 rounded">{selected.sku}</span></>
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
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 h-8 focus-within:border-indigo-400">
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
                      ${value === opt.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                    <div className="min-w-0">
                      <p className={`text-xs font-medium truncate ${value === opt.id ? 'text-indigo-700' : 'text-slate-900'}`}>{opt.name}</p>
                      <p className="text-[10px] font-mono text-slate-400">{opt.sku}</p>
                    </div>
                    {value === opt.id && <LuCheck className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
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

// ─── Reason helpers ────────────────────────────────────────────────────────────
const reasonLabels: Record<string, string> = {
  DAMAGED: 'Physically Damaged',
  BROKEN: 'Broken',
  LOST: 'Lost / Missing',
  EXPIRED: 'Expired',
};

const reasonBadgeColors: Record<string, string> = {
  DAMAGED: 'bg-amber-100 text-amber-800',
  BROKEN: 'bg-orange-100 text-orange-800',
  LOST: 'bg-slate-100 text-slate-600',
  EXPIRED: 'bg-red-100 text-red-800',
};

// ─── Status helpers ────────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-slate-100 text-slate-600',
};

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function DamageInventoryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // dialogs / modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingDmg, setEditingDmg] = useState<Damage | null>(null);
  const [detailsDamage, setDetailsDamage] = useState<Damage | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<Damage | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Damage | null>(null);
  // highlight item row when insufficient-stock error from complete API
  const [errorItemIndex, setErrorItemIndex] = useState<number | null>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: damagesRes, isLoading } = useQuery({
    queryKey: ['damages', 'list', page, searchTerm, selectedLocation, selectedStatus],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>('/damages/get-all-paginated', {
        params: { page, limit, searchTerm: searchTerm || undefined, locationId: selectedLocation || undefined, status: selectedStatus || undefined },
      });
      const p = r.data;
      return {
        data: (Array.isArray(p.data) ? p.data : ((p.data as any)?.data ?? [])) as Damage[],
        meta: (p.meta || (p.data as any)?.meta || { page: 1, totalPages: 1, total: 0, limit }) as { page: number; totalPages: number; total: number; limit: number },
      };
    },
  });

  const { data: locationsRes } = useQuery({
    queryKey: ['damages', 'locations'],
    queryFn: async () => (await apiClient.get<ApiResponse<any[]>>('/stocks/locations/get-all')).data.data,
  });

  const fetchById = async (id: string): Promise<Damage> => {
    const r = await apiClient.get<ApiResponse<Damage>>(`/damages/get/${id}`);
    return r.data.data as Damage;
  };

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: DamageFormValues) => apiClient.post<ApiResponse<any>>('/damages/create', payload),
    onSuccess: () => {
      toast.success('Draft damage report created');
      setFormOpen(false); reset();
      queryClient.invalidateQueries({ queryKey: ['damages'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DamageFormValues }) =>
      apiClient.patch<ApiResponse<any>>(`/damages/update/${id}`, payload),
    onSuccess: () => {
      toast.success('Damage report updated');
      setFormOpen(false); setEditingDmg(null); reset();
      queryClient.invalidateQueries({ queryKey: ['damages'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update'),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch<ApiResponse<any>>(`/damages/complete/${id}`),
    onSuccess: async (res) => {
      toast.success('Write-off completed — stock updated');
      setCompleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['damages'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      // open details dialog after completing
      const data = (res as any).data?.data;
      if (data?.id) {
        try { setDetailsDamage(await fetchById(data.id)); } catch {}
      }
    },
    onError: (err: any) => {
      const msg: string = err?.response?.data?.message || 'Failed to complete';
      toast.error(msg);
      setCompleteTarget(null);
      // try to highlight the failing item
      const match = msg.match(/product "(.+?)"/i);
      if (match && editingDmg) {
        const idx = editingDmg.items.findIndex(i => i.product?.name?.toLowerCase() === match[1].toLowerCase());
        if (idx !== -1) setErrorItemIndex(idx);
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch<ApiResponse<any>>(`/damages/cancel/${id}`),
    onSuccess: () => {
      toast.success('Damage report cancelled');
      setCancelTarget(null);
      queryClient.invalidateQueries({ queryKey: ['damages'] });
    },
    onError: (err: any) => { toast.error(err?.response?.data?.message || 'Failed to cancel'); setCancelTarget(null); },
  });

  // ─── Form ────────────────────────────────────────────────────────────────────
  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<DamageFormValues>({
    resolver: zodResolver(damageFormSchema) as any,
    defaultValues: { locationId: '', notes: '', items: [{ productId: '', quantity: 1, reason: 'DAMAGED' }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedLocationId = watch('locationId');
  const watchedItems = watch('items');

  // Location-scoped stocks — only products at the selected location
  const { data: locationStocksRes, isFetching: isLoadingLocationStocks } = useQuery({
    queryKey: ['damages', 'location-stocks', watchedLocationId],
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

  // Available qty map keyed by productId
  const stockQtyByProductId = useMemo(() => {
    const map: Record<string, number> = {};
    (locationStocksRes || []).forEach((s: any) => { map[s.productId] = s.quantity ?? 0; });
    return map;
  }, [locationStocksRes]);

  // When location changes, clear all item product selections so stale products don't linger
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
  };

  // Populate form when editing
  useEffect(() => {
    if (editingDmg) {
      reset({
        locationId: editingDmg.locationId,
        notes: editingDmg.notes || '',
        items: editingDmg.items.length
          ? editingDmg.items.map(i => ({ productId: i.productId, quantity: i.quantity, reason: i.reason }))
          : [{ productId: '', quantity: 1, reason: 'DAMAGED' }],
      });
    } else {
      reset({ locationId: '', notes: '', items: [{ productId: '', quantity: 1, reason: 'DAMAGED' }] });
    }
  }, [editingDmg, reset]);

  const onSubmit = (values: DamageFormValues) => {
    if (editingDmg) { updateMutation.mutate({ id: editingDmg.id, payload: values }); }
    else { createMutation.mutate(values); }
  };

  const handleViewClick = async (dmg: Damage) => {
    setDetailsLoading(true);
    try { setDetailsDamage(await fetchById(dmg.id)); }
    catch { setDetailsDamage({ ...dmg, items: dmg.items || [] }); }
    finally { setDetailsLoading(false); }
  };

  const handleEditClick = async (dmg: Damage) => {
    try { const full = await fetchById(dmg.id); setEditingDmg(full); }
    catch { setEditingDmg(dmg); }
    setFormOpen(true);
  };

  const itemsList = damagesRes?.data || [];
  const meta = damagesRes?.meta || { page: 1, totalPages: 1, total: 0, limit: 10 };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Damaged Inventory</h1>
          <p className="text-xs text-slate-500 mt-0.5">Create a DRAFT, review items, then Complete to write off stock.</p>
        </div>
        <Button onClick={() => { setEditingDmg(null); reset(); setFormOpen(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 self-start md:self-auto">
          <LuPlus className="h-4 w-4" /> Report Damage / Loss
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><LuSearch className="h-4 w-4" /></span>
            <input type="text" placeholder="Search damage number…" value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              className="pl-9 w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border" />
          </div>
          <select value={selectedLocation} onChange={e => { setSelectedLocation(e.target.value); setPage(1); }}
            className="w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3">
            <option value="">All Locations</option>
            {locationsRes?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={selectedStatus} onChange={e => { setSelectedStatus(e.target.value); setPage(1); }}
            className="w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3">
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card className="border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center"><Loader /></div>
        ) : itemsList.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-sm font-medium">No damage reports found.</p>
            <p className="text-xs text-slate-400 mt-1">Create a report to log damaged or lost items.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase">
                  <th className="p-4">Damage #</th>
                  <th className="p-4">Location</th>
                  <th className="p-4 hidden sm:table-cell">Date</th>
                  <th className="p-4 hidden md:table-cell">Total Qty</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 w-12">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {itemsList.map((dmg: Damage) => (
                  <tr key={dmg.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{dmg.damageNumber}</td>
                    <td className="p-4 font-semibold text-slate-900">{dmg.location?.name}</td>
                    <td className="p-4 hidden sm:table-cell text-slate-500">{new Date(dmg.damageDate || dmg.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 hidden md:table-cell text-center w-24">
                      {(() => {
                        // Total write-off quantity — sum of all item quantities
                        const fromItems = dmg.items?.reduce((s, i) => s + (i.quantity || 0), 0);
                        const qty = dmg.totalQuantity ?? (fromItems || undefined);
                        if (qty != null && qty > 0) {
                          return (
                            <span className="inline-flex items-center gap-1 font-bold text-red-600">
                              {qty}
                              
                            </span>
                          );
                        }
                        return <span className="text-slate-300">—</span>;
                      })()}
                    </td>
                    <td className="p-4 text-center">
                      <Badge className={`font-semibold py-0.5 px-2 text-[10px] uppercase rounded-full border-0 ${statusColors[dmg.status] || 'bg-slate-100 text-slate-600'}`}>
                        {dmg.status}
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
                          <DropdownMenuItem onClick={() => handleViewClick(dmg)} disabled={detailsLoading}
                            className="flex items-center gap-2 text-slate-600 cursor-pointer">
                            {detailsLoading ? <LuRefreshCw className="h-3.5 w-3.5 animate-spin" /> : <LuEye className="h-3.5 w-3.5" />}
                            View Details
                          </DropdownMenuItem>
                          {dmg.status === 'DRAFT' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEditClick(dmg)}
                                className="flex items-center gap-2 text-indigo-600 focus:text-indigo-700 focus:bg-indigo-50 cursor-pointer">
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setCompleteTarget(dmg)}
                                className="flex items-center gap-2 text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer">
                                <LuCircleCheck className="h-3.5 w-3.5" /> Complete
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setCancelTarget(dmg)}
                                className="flex items-center gap-2 text-slate-500 focus:text-slate-600 focus:bg-slate-50 cursor-pointer">
                                <LuCircleX className="h-3.5 w-3.5" /> Cancel
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

            {meta.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500">Page {meta.page} of {meta.totalPages} ({meta.total} entries)</p>
                <PaginationControl currentPage={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Create / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={o => { if (!o) { setFormOpen(false); setEditingDmg(null); reset(); setErrorItemIndex(null); } }} modal={false}>
        <DialogContent className="w-full max-w-[calc(100%-1rem)] sm:max-w-2xl lg:max-w-4xl max-h-[95dvh] sm:max-h-[92vh] overflow-y-auto p-0 rounded-xl sm:rounded-2xl">
          <DialogTitle className="sr-only">{editingDmg ? `Edit ${editingDmg.damageNumber}` : 'New Damage Report'}</DialogTitle>

          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              {editingDmg ? `Edit — ${editingDmg.damageNumber}` : 'Report Damaged / Lost Inventory'}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Saves as DRAFT first. Complete the draft to write off stock.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="px-4 sm:px-6 pb-4 sm:pb-6 pt-4 sm:pt-5 space-y-5">

            {/* Section 1: Header */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <LuMapPin className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">Report Details</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">Location *</label>
                  <select {...register('locationId')}
                    className="w-full h-10 bg-white border border-slate-200 text-slate-800 text-sm rounded-lg outline-none px-3 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all">
                    <option value="">Select Location</option>
                    {locationsRes?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                  {errors.locationId && <p className="text-red-500 text-[10px] flex items-center gap-1"><LucideAlertCircle className="h-3 w-3" />{errors.locationId.message}</p>}
                </div>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-200" />

            {/* Section 2: Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <LuBoxes className="h-3.5 w-3.5 text-indigo-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">Items to Write Off</h3>
                  {fields.length > 0 && <span className="text-[11px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">{fields.length}</span>}
                </div>
                <Button type="button" variant="outline" size="sm" disabled={!watchedLocationId}
                  onClick={() => { append({ productId: '', quantity: 1, reason: 'DAMAGED' }); setErrorItemIndex(null); }}
                  className="text-xs h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-medium shrink-0">
                  <LuPlus className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Add Row</span>
                </Button>
              </div>

              {!watchedLocationId ? (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <LucideAlertCircle className="h-4 w-4 shrink-0" />
                  Select a location first to see available products.
                </div>
              ) : isLoadingLocationStocks ? (
                <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                  <LuRefreshCw className="h-4 w-4 shrink-0 animate-spin" />
                  Loading products at this location…
                </div>
              ) : productOptions.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <LucideAlertCircle className="h-4 w-4 shrink-0" />
                  No stock found at this location. Receive stock first via GRN.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[640px]">
                      <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
                        <tr>
                          <th className="px-3 py-2.5">Product *</th>
                          <th className="px-3 py-2.5 text-center w-28">Available Qty</th>
                          <th className="px-3 py-2.5 text-center w-28">Write-off Qty *</th>
                          <th className="px-3 py-2.5 w-40">Reason *</th>
                          <th className="px-3 py-2.5 w-8"></th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {fields.map((field, index) => {
                          const pid = watchedItems?.[index]?.productId ?? '';
                          const availableQty = stockQtyByProductId[pid] ?? 0;
                          const writeoffQty = watchedItems?.[index]?.quantity || 0;
                          const isErrorRow = errorItemIndex === index;
                          const exceedsStock = pid && writeoffQty > availableQty;

                          return (
                            <tr key={field.id} className={`transition-colors ${isErrorRow ? 'bg-red-50' : 'hover:bg-slate-50/80'}`}>
                              <td className="px-3 py-2">
                                <ProductCombobox
                                  value={pid}
                                  onChange={id => handleProductSelect(index, id)}
                                  options={productOptions}
                                  disabled={isLoadingLocationStocks}
                                  hasError={!!errors.items?.[index]?.productId || isErrorRow}
                                  placeholder="Select product…"
                                />
                                {errors.items?.[index]?.productId && (
                                  <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1">
                                    <LucideAlertCircle className="h-3 w-3 shrink-0" />
                                    {errors.items[index]?.productId?.message}
                                  </p>
                                )}
                                {isErrorRow && <p className="text-[10px] text-red-600 mt-0.5 font-semibold">Insufficient stock</p>}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={`font-bold text-sm ${availableQty === 0 && pid ? 'text-amber-600' : 'text-slate-600'}`}>
                                  {pid ? availableQty : <span className="text-slate-300">—</span>}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <input type="number"
                                  {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                                  disabled={!pid}
                                  placeholder="0"
                                  className={`w-full h-9 text-center font-bold text-sm rounded-lg border outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed
                                    ${exceedsStock ? 'border-red-300 bg-red-50 text-red-700 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                                      : 'border-red-200 bg-red-50 text-red-700 focus:border-red-400 focus:ring-2 focus:ring-red-100'}`} />
                                {errors.items?.[index]?.quantity && (
                                  <p className="text-[10px] text-red-500 mt-0.5 text-center">
                                    {(errors.items[index]?.quantity as any)?.message}
                                  </p>
                                )}
                                {exceedsStock && <p className="text-[10px] text-red-600 mt-0.5 text-center font-semibold">Exceeds stock</p>}
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  {...register(`items.${index}.reason`)}
                                  disabled={!pid}
                                  className="w-full h-9 bg-white border border-slate-200 text-slate-700 text-xs rounded-lg outline-none px-2 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                                  <option value="DAMAGED">Physically Damaged</option>
                                  <option value="BROKEN">Broken</option>
                                  <option value="LOST">Lost / Missing</option>
                                  <option value="EXPIRED">Expired</option>
                                </select>
                              </td>
                              <td className="px-3 py-2 text-center">
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

                  {fields.length > 0 && (
                    <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-slate-50 border-t border-slate-200">
                      <span className="text-[11px] text-slate-400">{fields.length} item{fields.length !== 1 ? 's' : ''}</span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span className="text-red-600 font-bold">
                          {(watchedItems || []).reduce((s, i) => s + (i.quantity || 0), 0)}
                        </span>
                        <span className="text-slate-400">total units to write off</span>
                      </span>
                    </div>
                  )}
                </div>
              )}
              {errors.items && !Array.isArray(errors.items) && (
                <p className="text-xs text-red-500 flex items-center gap-1.5"><LucideAlertCircle className="h-3.5 w-3.5 shrink-0" />{errors.items.message}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">Notes <span className="font-normal text-slate-400">(Optional)</span></label>
              <textarea rows={3} placeholder="Details of accident, spill, expiry inspection report…" {...register('notes')}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400" />
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 bg-rose-50 p-3 rounded-xl border border-rose-200 text-rose-800 text-xs font-medium">
              <LucideAlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              Completing this report will permanently deduct these quantities from active stock levels.
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-2 sm:gap-3">
                <Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditingDmg(null); reset(); setErrorItemIndex(null); }}
                  className="text-sm">Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 sm:px-5 rounded-xl">
                  {(createMutation.isPending || updateMutation.isPending) && <LuRefreshCw className="animate-spin h-4 w-4 mr-2" />}
                  {editingDmg ? 'Update Draft' : 'Save as Draft'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── View Details Dialog ───────────────────────────────────────────────── */}
      <Dialog open={!!detailsDamage} onOpenChange={o => { if (!o) setDetailsDamage(null); }}>
        {detailsDamage && (
          <DialogContent className="w-full max-w-[calc(100%-1rem)] sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl sm:rounded-2xl p-0">
            <DialogTitle className="sr-only">Damage Report Details</DialogTitle>
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">{detailsDamage.damageNumber}</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">{new Date(detailsDamage.damageDate || detailsDamage.createdAt).toLocaleString()}</p>
              </div>
              <Badge className={`font-semibold py-0.5 px-2.5 text-[10px] uppercase rounded-full border-0 ${statusColors[detailsDamage.status]}`}>
                {detailsDamage.status}
              </Badge>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px] mb-0.5">Location</p>
                  <p className="font-semibold text-slate-900">{detailsDamage.location?.name}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px] mb-0.5">Date</p>
                  <p className="font-semibold text-slate-900">{new Date(detailsDamage.damageDate || detailsDamage.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              {detailsDamage.notes && (
                <div className="bg-slate-50 rounded-xl p-3 text-xs">
                  <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px] mb-0.5">Notes</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{detailsDamage.notes}</p>
                </div>
              )}

              {/* Items */}
              {(detailsDamage.items?.length ?? 0) > 0 ? (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[480px]">
                      <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
                        <tr>
                          <th className="px-3 py-2.5">Product</th>
                          <th className="px-3 py-2.5">SKU</th>
                          <th className="px-3 py-2.5 text-center">Write-off Qty</th>
                          <th className="px-3 py-2.5 text-center">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailsDamage.items.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2.5">
                              <p className="font-semibold text-slate-900">{item.product?.name}</p>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-slate-400 text-[10px]">{item.product?.sku}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="font-bold text-sm text-red-600">{item.quantity}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <Badge className={`font-semibold py-0.5 px-2 text-[10px] uppercase rounded-full border-0 ${reasonBadgeColors[item.reason] || 'bg-slate-100 text-slate-600'}`}>
                                {reasonLabels[item.reason] || item.reason}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  No item details available — items are loaded when the report is fetched individually.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                {detailsDamage.status === 'DRAFT' && (
                  <Button size="sm" onClick={() => { setDetailsDamage(null); setCompleteTarget(detailsDamage); }}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs h-8 px-4">
                    <LuCircleCheck className="h-3.5 w-3.5 mr-1.5" /> Write Off
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setDetailsDamage(null)} className="text-xs h-8">Close</Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* ── Complete Confirmation ──────────────────────────────────────────────── */}
      <DeleteModal
        open={!!completeTarget}
        onOpenChange={o => { if (!o) setCompleteTarget(null); }}
        title="Complete Write-off"
        description={`This will permanently write off stock for ${completeTarget?.items?.length ?? '?'} items at ${completeTarget?.location?.name}. This cannot be undone.`}
        loading={completeMutation.isPending}
        onConfirm={() => { if (completeTarget) completeMutation.mutate(completeTarget.id); }}
        confirmLabel="Confirm Write-off"
        cancelLabel="Go Back"
      />

      {/* ── Cancel Confirmation ───────────────────────────────────────────────── */}
      <DeleteModal
        open={!!cancelTarget}
        onOpenChange={o => { if (!o) setCancelTarget(null); }}
        title="Cancel Damage Report"
        description="This will cancel the draft damage report. No stock changes will be made. This action cannot be undone."
        loading={cancelMutation.isPending}
        onConfirm={() => { if (cancelTarget) cancelMutation.mutate(cancelTarget.id); }}
        confirmLabel="Cancel Report"
        cancelLabel="Go Back"
      />

    </div>
  );
}
