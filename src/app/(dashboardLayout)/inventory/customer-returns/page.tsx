'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/auth';
import {
  LuSearch, LuPlus, LuEye, LuRefreshCw, LuX,
  LuCircleCheck, LuCircleX, LuPackageOpen,
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
import { MoreHorizontal, Pencil } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReturnItem {
  id: string;
  productId: string;
  quantity: number;
  product?: { name: string; sku: string };
}

interface CustomerReturn {
  id: string;
  returnNumber: string;
  locationId: string;
  location: { name: string };
  status: 'PENDING' | 'REFUNDED' | 'CANCELLED';
  notes?: string;
  returnDate?: string;
  createdAt: string;
  items: ReturnItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  REFUNDED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const totalQty = (items: ReturnItem[]) => (items || []).reduce((s, i) => s + (i.quantity || 0), 0);

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function CustomerReturnsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const [detailsReturn, setDetailsReturn] = useState<CustomerReturn | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [refundTarget, setRefundTarget] = useState<CustomerReturn | null>(null);
  const [cancelTarget, setCancelTarget] = useState<CustomerReturn | null>(null);

  const hasFilters = !!(searchTerm || selectedLocation || selectedStatus);

  // ─── Queries ─────────────────────────────────────────────────────────────────
  const { data: returnsRes, isLoading } = useQuery({
    queryKey: ['customer-returns', 'list', page, limit, searchTerm, selectedLocation, selectedStatus],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>('/customer-returns/get-all-paginated', {
        params: { page, limit, searchTerm: searchTerm || undefined, locationId: selectedLocation || undefined, status: selectedStatus || undefined },
      });
      const p = r.data;
      return {
        data: (Array.isArray(p.data) ? p.data : []) as CustomerReturn[],
        meta: (p.meta || { page: 1, totalPages: 1, total: 0, limit }) as { page: number; totalPages: number; total: number; limit: number },
      };
    },
  });

  const { data: locationsRes } = useQuery({
    queryKey: ['customer-returns', 'locations'],
    queryFn: async () => (await apiClient.get<ApiResponse<any[]>>('/stocks/locations/get-all')).data.data,
  });

  const fetchById = async (id: string): Promise<CustomerReturn> => {
    const r = await apiClient.get<ApiResponse<CustomerReturn>>(`/customer-returns/get/${id}`);
    return r.data.data as CustomerReturn;
  };

  // ─── Mutations ────────────────────────────────────────────────────────────────
  const refundMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch<ApiResponse<any>>(`/customer-returns/refund/${id}`),
    onSuccess: async (res) => {
      toast.success('Refund confirmed — stock credited to location');
      setRefundTarget(null);
      queryClient.invalidateQueries({ queryKey: ['customer-returns'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      const data = (res as any).data?.data;
      if (data?.id) { try { setDetailsReturn(await fetchById(data.id)); } catch {} }
    },
    onError: (err: any) => { toast.error(err?.response?.data?.message || 'Failed to refund'); setRefundTarget(null); },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch<ApiResponse<any>>(`/customer-returns/cancel/${id}`),
    onSuccess: () => {
      toast.success('Customer return cancelled');
      setCancelTarget(null);
      queryClient.invalidateQueries({ queryKey: ['customer-returns'] });
    },
    onError: (err: any) => { toast.error(err?.response?.data?.message || 'Failed to cancel'); setCancelTarget(null); },
  });

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleViewClick = async (ret: CustomerReturn) => {
    setDetailsLoading(true);
    try { setDetailsReturn(await fetchById(ret.id)); }
    catch { setDetailsReturn({ ...ret, items: ret.items || [] }); }
    finally { setDetailsLoading(false); }
  };

  const itemsList = returnsRes?.data || [];
  const meta = returnsRes?.meta || { page: 1, totalPages: 1, total: 0, limit };

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Customer Returns</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log returned items, then confirm refund to credit stock back to a location.
          </p>
        </div>
        <Button
          onClick={() => router.push('/inventory/customer-returns/new')}
          className="bg-primary hover:bg-primary/90 text-white font-medium text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 self-start md:self-auto"
        >
          <LuPlus className="h-4 w-4" /> New Return
        </Button>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <Card className="p-4 border-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <LuSearch className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search return number…"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              className="pl-9 w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <select value={selectedLocation} onChange={e => { setSelectedLocation(e.target.value); setPage(1); }}
            className="w-44 bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3">
            <option value="">All Locations</option>
            {locationsRes?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={selectedStatus} onChange={e => { setSelectedStatus(e.target.value); setPage(1); }}
            className="w-44 bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3">
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="REFUNDED">Refunded</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {hasFilters && (
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setSelectedLocation(''); setSelectedStatus(''); setPage(1); }}
              className="h-10 w-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors shrink-0"
              title="Reset filters"
            >
              <LuX className="h-4 w-4" />
            </button>
          )}
        </div>
      </Card>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <Card className="border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center"><Loader /></div>
        ) : itemsList.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <LuPackageOpen className="h-10 w-10 text-slate-200 mx-auto mb-2" />
            <p className="text-sm font-medium">No customer returns found.</p>
            <p className="text-xs text-slate-400 mt-1">Create a return to credit stock back to a location.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-600 font-semibold text-xs uppercase">
                  <th className="p-4">Return #</th>
                  <th className="p-4">Location</th>
                  <th className="p-4 text-center hidden sm:table-cell">Total Qty</th>
                  <th className="p-4 hidden md:table-cell">Notes</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 hidden sm:table-cell">Date</th>
                  <th className="p-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
                {itemsList.map(ret => (
                  <tr key={ret.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{ret.returnNumber}</td>
                    <td className="p-4 font-medium text-slate-900">{ret.location?.name}</td>
                    <td className="p-4 text-center hidden sm:table-cell">
                      <span className="font-bold text-primary text-sm">{totalQty(ret.items)}</span>
                    </td>
                    <td className="p-4 hidden md:table-cell text-slate-500 max-w-[180px] truncate">{ret.notes || '—'}</td>
                    <td className="p-4 text-center">
                      <Badge className={`font-semibold py-0.5 px-2 text-[10px] uppercase rounded-full border-0 ${statusColors[ret.status] || 'bg-slate-100 text-slate-700'}`}>
                        {ret.status}
                      </Badge>
                    </td>
                    <td className="p-4 hidden sm:table-cell text-slate-500">
                      {new Date(ret.returnDate || ret.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-500">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-100 shadow-lg">
                          <DropdownMenuItem
                            onClick={() => handleViewClick(ret)}
                            disabled={detailsLoading}
                            className="flex items-center gap-2 text-slate-600 cursor-pointer"
                          >
                            {detailsLoading ? <LuRefreshCw className="h-3.5 w-3.5 animate-spin" /> : <LuEye className="h-3.5 w-3.5" />}
                            View Details
                          </DropdownMenuItem>
                          {ret.status === 'PENDING' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => router.push(`/inventory/customer-returns/edit/${ret.id}`)}
                                className="flex items-center gap-2 text-primary focus:text-primary focus:bg-primary/5 cursor-pointer"
                              >
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setRefundTarget(ret)}
                                className="flex items-center gap-2 text-green-600 focus:text-green-700 focus:bg-green-50 cursor-pointer"
                              >
                                <LuCircleCheck className="h-3.5 w-3.5" /> Refund
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setCancelTarget(ret)}
                                className="flex items-center gap-2 text-red-500 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                              >
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
            <div className="p-4 border-t border-slate-100">
              <PaginationControl
                currentPage={meta.page}
                totalPages={meta.totalPages}
                onPageChange={setPage}
                totalItems={meta.total}
                itemsPerPage={limit}
                onLimitChange={newLimit => { setLimit(newLimit); setPage(1); }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* ── View Details Dialog ───────────────────────────────────────────────── */}
      <Dialog open={!!detailsReturn} onOpenChange={o => { if (!o) setDetailsReturn(null); }}>
        {detailsReturn && (
          <DialogContent className="w-full max-w-[calc(100%-1rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-xl sm:rounded-2xl p-0">
            <DialogTitle className="sr-only">Return Details</DialogTitle>
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <LuPackageOpen className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{detailsReturn.returnNumber}</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">{new Date(detailsReturn.returnDate || detailsReturn.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <Badge className={`font-semibold py-0.5 px-2.5 text-[10px] uppercase rounded-full border-0 ${statusColors[detailsReturn.status]}`}>
                {detailsReturn.status}
              </Badge>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px] mb-0.5">Location</p>
                  <p className="font-semibold text-slate-900">{detailsReturn.location?.name}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px] mb-0.5">Total Qty Returned</p>
                  <p className="font-bold text-primary text-base">+{totalQty(detailsReturn.items)}</p>
                </div>
              </div>

              {detailsReturn.notes && (
                <div className="bg-slate-50 rounded-xl p-3 text-xs">
                  <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px] mb-1">Notes</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{detailsReturn.notes}</p>
                </div>
              )}

              {(detailsReturn.items?.length ?? 0) > 0 ? (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
                      <tr>
                        <th className="px-3 py-2.5">Product</th>
                        <th className="px-3 py-2.5">SKU</th>
                        <th className="px-3 py-2.5 text-center">Qty Returned</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailsReturn.items.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 font-semibold text-slate-900">{item.product?.name || '—'}</td>
                          <td className="px-3 py-2.5 font-mono text-slate-400 text-[10px]">{item.product?.sku || '—'}</td>
                          <td className="px-3 py-2.5 text-center font-bold text-primary">+{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  Item details not available in list view — fetched on individual load.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                {detailsReturn.status === 'PENDING' && (
                  <Button size="sm" onClick={() => { setDetailsReturn(null); setRefundTarget(detailsReturn); }}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-4">
                    <LuCircleCheck className="h-3.5 w-3.5 mr-1.5" /> Confirm Refund
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setDetailsReturn(null)} className="text-xs h-8">Close</Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* ── Refund Confirmation ───────────────────────────────────────────────── */}
      <DeleteModal
        open={!!refundTarget}
        onOpenChange={o => { if (!o) setRefundTarget(null); }}
        title="Confirm Refund"
        description={`This will add ${totalQty(refundTarget?.items || [])} total qty items back to stock at "${refundTarget?.location?.name}". Cannot be undone.`}
        loading={refundMutation.isPending}
        onConfirm={() => { if (refundTarget) refundMutation.mutate(refundTarget.id); }}
        confirmLabel="Confirm Refund"
        cancelLabel="Go Back"
      />

      {/* ── Cancel Confirmation ───────────────────────────────────────────────── */}
      <DeleteModal
        open={!!cancelTarget}
        onOpenChange={o => { if (!o) setCancelTarget(null); }}
        title="Cancel Return"
        description="This will cancel the pending return. No stock changes will be made."
        loading={cancelMutation.isPending}
        onConfirm={() => { if (cancelTarget) cancelMutation.mutate(cancelTarget.id); }}
        confirmLabel="Cancel Return"
        cancelLabel="Go Back"
      />

    </div>
  );
}
