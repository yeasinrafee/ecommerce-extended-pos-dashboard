'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/auth';
import {
  LuSearch, LuPlus, LuEye, LuRefreshCw, LuPackageOpen,
  LuCircleCheck, LuX,
} from 'react-icons/lu';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Loader from '@/components/Common/Loader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { PaginationControl } from '@/components/Common/Pagination';

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Status helpers ───────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-800',
  RECEIVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function GRNPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');

  const [detailsGRN, setDetailsGRN] = useState<GoodsReceive | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: grnRes, isLoading: isLoadingGRNs } = useQuery({
    queryKey: ['grns', 'list', page, limit, searchTerm, selectedLocation, selectedSupplier],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>('/goods-receives/get-all-paginated', {
        params: {
          page, limit,
          searchTerm: searchTerm || undefined,
          locationId: selectedLocation || undefined,
          supplierId: selectedSupplier || undefined,
        },
      });
      const payload = r.data.data;
      if (Array.isArray(payload))
        return { data: payload, meta: { page: 1, totalPages: 1, total: payload.length, limit } };
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

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleViewGRN = async (grn: GoodsReceive) => {
    setDetailsLoading(true);
    try {
      const r = await apiClient.get<ApiResponse<GoodsReceive>>(`/goods-receives/get/${grn.id}`);
      const full = r.data.data as GoodsReceive;
      setDetailsGRN({ ...full, items: full.items || [] });
    } catch {
      setDetailsGRN({ ...grn, items: grn.items || [] });
    } finally {
      setDetailsLoading(false);
    }
  };

  const itemsList: GoodsReceive[] = grnRes?.data || [];
  const meta = grnRes?.meta || { page: 1, totalPages: 1, total: 0, limit };
  const hasFilters = !!(searchTerm || selectedLocation || selectedSupplier);

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Goods Receive Notes (GRN)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record incoming shipments, verify quantities, then confirm to update stock.
          </p>
        </div>
        <Button
          onClick={() => router.push('/inventory/grn/new')}
          className="bg-primary hover:bg-primary/90 text-white font-medium text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 self-start md:self-auto"
        >
          <LuPlus className="h-4 w-4" /> New GRN
        </Button>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <Card className="p-4 border-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <LuSearch className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search GRN number, bill…"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              className="pl-9 w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <select
            value={selectedSupplier}
            onChange={e => { setSelectedSupplier(e.target.value); setPage(1); }}
            className="w-44 bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3"
          >
            <option value="">All Suppliers</option>
            {suppliersRes?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select
            value={selectedLocation}
            onChange={e => { setSelectedLocation(e.target.value); setPage(1); }}
            className="w-44 bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3"
          >
            <option value="">All Locations</option>
            {locationsRes?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          {hasFilters && (
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setSelectedSupplier(''); setSelectedLocation(''); setPage(1); }}
              className="h-10 w-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors shrink-0"
              title="Reset filters"
            >
              <LuX className="h-4 w-4" />
            </button>
          )}
        </div>
      </Card>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <Card className="border-slate-100 shadow-sm overflow-hidden">
        {isLoadingGRNs ? (
          <div className="flex h-64 items-center justify-center"><Loader /></div>
        ) : itemsList.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <LuPackageOpen className="h-10 w-10 text-slate-200 mx-auto mb-2" />
            <p className="text-sm font-medium">No Goods Receive Notes found.</p>
            <p className="text-xs text-slate-400 mt-1">Create a GRN to check-in stock items.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-600 font-semibold text-xs uppercase">
                  <th className="p-4">GRN Number</th>
                  <th className="p-4 hidden md:table-cell">Linked PO</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4 hidden sm:table-cell">Location</th>
                  <th className="p-4 hidden lg:table-cell">Receive Date</th>
                  <th className="p-4 hidden lg:table-cell">Bill</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
                {itemsList.map(grn => (
                  <tr key={grn.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{grn.grnNumber}</td>
                    <td className="p-4 hidden md:table-cell text-slate-500">
                      {grn.purchaseOrder?.poNumber || <span className="text-slate-300">Direct In</span>}
                    </td>
                    <td className="p-4 font-medium text-slate-900">{grn.supplier?.name}</td>
                    <td className="p-4 hidden sm:table-cell text-slate-600">{grn.location?.name}</td>
                    <td className="p-4 hidden lg:table-cell text-slate-500">
                      {new Date(grn.receiveDate).toLocaleDateString()}
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      {grn.billNumber
                        ? <div>
                            <p className="font-semibold text-slate-800">{grn.billNumber}</p>
                            <p className="text-[10px] text-slate-400">৳{(grn.billAmount || 0).toFixed(2)}</p>
                          </div>
                        : <span className="text-slate-300 text-xs">No Bill</span>}
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
                          <DropdownMenuItem
                            onClick={() => handleViewGRN(grn)}
                            disabled={detailsLoading}
                            className="flex items-center gap-2 text-slate-600 cursor-pointer"
                          >
                            {detailsLoading
                              ? <LuRefreshCw className="h-3.5 w-3.5 animate-spin" />
                              : <LuEye className="h-3.5 w-3.5" />}
                            View Details
                          </DropdownMenuItem>
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

      {/* ── View Details Dialog ──────────────────────────────────────────────── */}
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
                  <p className="text-[11px] text-slate-400 mt-0.5">Goods Receive Note Details</p>
                </div>
              </div>
              {detailsGRN && (
                <Badge className={`font-semibold py-0.5 px-2.5 text-[10px] uppercase rounded-full border-0 shrink-0 ${statusColors[detailsGRN.status]}`}>
                  {detailsGRN.status}
                </Badge>
              )}
            </div>
          </div>

          {detailsGRN && (
            <div className="px-5 py-4 space-y-4">
              {/* Meta grid */}
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
                  <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">Linked PO</p>
                  <p className="font-semibold text-slate-900">{detailsGRN.purchaseOrder?.poNumber || 'Direct In'}</p>
                </div>
                {detailsGRN.billNumber && (
                  <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                    <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">Bill No.</p>
                    <p className="font-semibold text-slate-900">{detailsGRN.billNumber}</p>
                  </div>
                )}
                {detailsGRN.billAmount != null && (
                  <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                    <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">Bill Amount</p>
                    <p className="font-semibold text-slate-900">৳{Number(detailsGRN.billAmount).toFixed(2)}</p>
                  </div>
                )}
              </div>

              {/* Items table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[520px]">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
                      <tr>
                        <th className="px-3 py-2.5">Product</th>
                        <th className="px-3 py-2.5 text-center">Ordered</th>
                        <th className="px-3 py-2.5 text-center">Received</th>
                        <th className="px-3 py-2.5 text-center">Accepted</th>
                        <th className="px-3 py-2.5 text-center">Rejected</th>
                        <th className="px-3 py-2.5 text-center">Unit ৳</th>
                        <th className="px-3 py-2.5 text-right">Total ৳</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(detailsGRN.items || []).map(item => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <p className="font-medium text-slate-900 truncate max-w-[140px]">{item.product?.name || '—'}</p>
                            <p className="text-[10px] font-mono text-slate-400">{item.product?.sku || ''}</p>
                          </td>
                          <td className="px-3 py-2 text-center text-slate-600">{item.quantityOrdered}</td>
                          <td className="px-3 py-2 text-center font-semibold text-slate-800">{item.quantityReceived}</td>
                          <td className="px-3 py-2 text-center text-emerald-600 font-semibold">{item.quantityAccepted}</td>
                          <td className="px-3 py-2 text-center text-red-500">{item.quantityRejected}</td>
                          <td className="px-3 py-2 text-center text-slate-700">৳{(Number(item.unitPrice) || 0).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900">৳{(Number(item.totalPrice) || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {detailsGRN.notes && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{detailsGRN.notes}</p>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button variant="outline" size="sm" onClick={() => setDetailsGRN(null)} className="text-xs h-8 rounded-lg">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
