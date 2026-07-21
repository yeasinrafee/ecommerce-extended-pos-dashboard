'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/auth';
import {
  LuSearch,
  LuPlus,
  LuEye,
  LuRefreshCw,
  LuArrowRight,
  LuTruck,
  LuPackage,
  LuX,
} from 'react-icons/lu';
import { toast } from 'react-hot-toast';
import Loader from '@/components/Common/Loader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { PaginationControl } from '@/components/Common/Pagination';
import DeleteModal from '@/components/Common/DeleteModal';
import { MoreHorizontal, Pencil } from 'lucide-react';
import type { StockTransfer } from '@/components/Inventory/TransferForm';

// ─── Status helpers ───────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-800',
  IN_TRANSIT: 'bg-blue-100 text-blue-800',
  RECEIVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-slate-100 text-slate-600',
};

export default function StockTransfersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedDest, setSelectedDest] = useState('');

  const [detailsTransfer, setDetailsTransfer] = useState<StockTransfer | null>(
    null,
  );
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [shipConfirmId, setShipConfirmId] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  // ─── Queries ─────────────────────────────────────────────────────────────────
  const { data: transfersRes, isLoading } = useQuery({
    queryKey: [
      'transfers',
      'list',
      page,
      limit,
      searchTerm,
      selectedStatus,
      selectedSource,
      selectedDest,
    ],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>(
        '/stock-transfers/get-all-paginated',
        {
          params: {
            page,
            limit,
            searchTerm: searchTerm || undefined,
            status: selectedStatus || undefined,
            sourceLocationId: selectedSource || undefined,
            destinationLocationId: selectedDest || undefined,
          },
        },
      );
      const payload = r.data.data;
      if (Array.isArray(payload))
        return {
          data: payload,
          meta: { page: 1, totalPages: 1, total: payload.length, limit },
        };
      return payload;
    },
  });

  const { data: locationsRes } = useQuery({
    queryKey: ['transfers', 'locations'],
    queryFn: async () =>
      (await apiClient.get<ApiResponse<any[]>>('/stocks/locations/get-all'))
        .data.data,
  });

  const fetchById = async (id: string): Promise<StockTransfer> => {
    const r = await apiClient.get<ApiResponse<StockTransfer>>(
      `/stock-transfers/get/${id}`,
    );
    return r.data.data as StockTransfer;
  };

  // ─── Mutations ────────────────────────────────────────────────────────────────
  const shipMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<ApiResponse<any>>(`/stock-transfers/ship/${id}`),
    onSuccess: () => {
      toast.success('Transfer is now IN TRANSIT — source stock deducted');
      setShipConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Failed to ship');
      setShipConfirmId(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<ApiResponse<any>>(`/stock-transfers/cancel/${id}`),
    onSuccess: () => {
      toast.success('Transfer cancelled — stock restored if applicable');
      setCancelConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Failed to cancel');
      setCancelConfirmId(null);
    },
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────────
  const handleViewClick = async (tr: StockTransfer) => {
    setDetailsLoading(true);
    try {
      setDetailsTransfer(await fetchById(tr.id));
    } catch {
      setDetailsTransfer({ ...tr, items: tr.items || [] });
    } finally {
      setDetailsLoading(false);
    }
  };

  const itemsList: StockTransfer[] = transfersRes?.data || [];
  const meta = transfersRes?.meta || {
    page: 1,
    totalPages: 1,
    total: 0,
    limit,
  };

  return (
    <div className='p-0 lg:p-6 space-y-6'>
      {/* ── Header ── */}
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-xl border border-gray-100 shadow-sm'>
        <div>
          <h1 className='text-xl font-bold text-slate-800'>Stock Transfers</h1>
          <p className='text-xs text-slate-500 mt-0.5'>
            Move inventory between locations. DRAFT → IN TRANSIT → RECEIVED.
          </p>
        </div>
        <Button
          onClick={() => router.push('/inventory/transfers/new')}
          className='bg-primary hover:bg-primary/90 text-white font-medium text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 self-start md:self-auto'
        >
          <LuPlus className='h-4 w-4' /> New Transfer
        </Button>
      </div>

      {/* ── Filters ── */}
      <Card className='p-4 border-slate-100 shadow-sm'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='relative'>
            <span className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400'>
              <LuSearch className='h-4 w-4' />
            </span>
            <input
              type='text'
              placeholder='Search transfer #…'
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className='pl-9 w-64 bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border'
            />
          </div>
          <div className='flex items-center gap-3 flex-wrap'>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className='w-44 bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3'
            >
              <option value=''>All Statuses</option>
              <option value='DRAFT'>Draft</option>
              <option value='IN_TRANSIT'>In Transit</option>
              <option value='RECEIVED'>Received</option>
              <option value='CANCELLED'>Cancelled</option>
            </select>
            <select
              value={selectedSource}
              onChange={(e) => {
                setSelectedSource(e.target.value);
                setPage(1);
              }}
              className='w-44 bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3'
            >
              <option value=''>All Sources</option>
              {locationsRes?.map((l: any) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <select
              value={selectedDest}
              onChange={(e) => {
                setSelectedDest(e.target.value);
                setPage(1);
              }}
              className='w-44 bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3'
            >
              <option value=''>All Destinations</option>
              {locationsRes?.map((l: any) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* ── Table ── */}
      <Card className='border-slate-100 shadow-sm overflow-hidden'>
        {isLoading ? (
          <div className='flex h-64 items-center justify-center'>
            <Loader />
          </div>
        ) : itemsList.length === 0 ? (
          <div className='p-12 text-center text-slate-500'>
            <p className='text-sm font-medium'>No stock transfers found.</p>
            <p className='text-xs text-slate-400 mt-1'>
              Create a transfer to move inventory between locations.
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full border-collapse text-left'>
              <thead>
                <tr className='bg-slate-100 border-b border-slate-300 text-slate-600 font-semibold text-xs uppercase'>
                  <th className='p-4'>Transfer #</th>
                  <th className='p-4'>From</th>
                  <th className='p-4 w-8'></th>
                  <th className='p-4'>To</th>
                  <th className='p-4 text-center'>Items</th>
                  <th className='p-4 text-center'>Status</th>
                  <th className='p-4 hidden sm:table-cell text-center'>Date</th>
                  <th className='p-4 w-12'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-200 text-sm text-slate-700'>
                {itemsList.map((tr) => (
                  <tr
                    key={tr.id}
                    className='hover:bg-slate-50 transition-colors'
                  >
                    <td className='p-4 font-bold text-slate-900'>
                      {tr.transferNumber}
                    </td>
                    <td className='p-4'>
                      <p className='font-semibold text-slate-900'>
                        {tr.sourceLocation?.name}
                      </p>
                      <p className='text-[10px] font-mono text-slate-400'>
                        {tr.sourceLocation?.code}
                      </p>
                    </td>
                    <td className='p-4 text-slate-300'>
                      <LuArrowRight className='h-4 w-4' />
                    </td>
                    <td className='p-4'>
                      <p className='font-semibold text-slate-900'>
                        {tr.destinationLocation?.name}
                      </p>
                      <p className='text-[10px] font-mono text-slate-400'>
                        {tr.destinationLocation?.code}
                      </p>
                    </td>
                    <td className='p-4 text-center font-semibold text-slate-600'>
                      {tr.items?.length ?? '—'}
                    </td>
                    <td className='p-4 text-center'>
                      <Badge
                        className={`font-semibold py-0.5 px-2 text-[10px] uppercase rounded-full border-0 ${statusColors[tr.status] || 'bg-slate-100 text-slate-600'}`}
                      >
                        {tr.status === 'IN_TRANSIT' ? 'In Transit' : tr.status}
                      </Badge>
                    </td>
                    <td className='p-4 hidden sm:table-cell text-slate-500 text-center'>
                      {new Date(tr.createdAt).toLocaleDateString()}
                    </td>
                    <td className='p-4 text-center'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 rounded-full hover:bg-slate-100 text-slate-500'
                          >
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align='end'
                          className='w-48 rounded-xl border-slate-100 shadow-lg'
                        >
                          <DropdownMenuItem
                            onClick={() => handleViewClick(tr)}
                            disabled={detailsLoading}
                            className='flex items-center gap-2 text-slate-600 cursor-pointer'
                          >
                            {detailsLoading ? (
                              <LuRefreshCw className='h-3.5 w-3.5 animate-spin' />
                            ) : (
                              <LuEye className='h-3.5 w-3.5' />
                            )}
                            View Details
                          </DropdownMenuItem>
                          {tr.status === 'DRAFT' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/inventory/transfers/edit/${tr.id}`,
                                  )
                                }
                                className='flex items-center gap-2 text-primary focus:text-primary/80 focus:bg-primary/5 cursor-pointer'
                              >
                                <Pencil className='h-3.5 w-3.5' /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setShipConfirmId(tr.id)}
                                className='flex items-center gap-2 text-blue-600 focus:text-blue-700 focus:bg-blue-50 cursor-pointer'
                              >
                                <LuTruck className='h-3.5 w-3.5' /> Ship
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setCancelConfirmId(tr.id)}
                                className='flex items-center gap-2 text-red-500 focus:text-red-600 focus:bg-red-50 cursor-pointer'
                              >
                                <LuX className='h-3.5 w-3.5' /> Cancel
                              </DropdownMenuItem>
                            </>
                          )}
                          {tr.status === 'IN_TRANSIT' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/inventory/transfers/receive/${tr.id}`,
                                  )
                                }
                                className='flex items-center gap-2 text-green-600 focus:text-green-700 focus:bg-green-50 cursor-pointer'
                              >
                                <LuPackage className='h-3.5 w-3.5' /> Receive
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setCancelConfirmId(tr.id)}
                                className='flex items-center gap-2 text-red-500 focus:text-red-600 focus:bg-red-50 cursor-pointer'
                              >
                                <LuX className='h-3.5 w-3.5' /> Cancel
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
            <div className='p-4 border-t border-slate-100'>
              <PaginationControl
                currentPage={meta.page}
                totalPages={meta.totalPages}
                onPageChange={setPage}
                totalItems={meta.total}
                itemsPerPage={limit}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* ── View Details Dialog ── */}
      <Dialog
        open={!!detailsTransfer}
        onOpenChange={(o) => {
          if (!o) setDetailsTransfer(null);
        }}
      >
        {detailsTransfer && (
          <DialogContent className='w-full max-w-[calc(100%-1rem)] sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl sm:rounded-2xl p-0'>
            <DialogTitle className='sr-only'>Transfer Details</DialogTitle>
            <div className='sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between gap-3'>
              <div>
                <h2 className='text-sm font-bold text-slate-900'>
                  {detailsTransfer.transferNumber}
                </h2>
                <p className='text-[11px] text-slate-400 mt-0.5'>
                  {new Date(detailsTransfer.createdAt).toLocaleString()}
                </p>
              </div>
              <Badge
                className={`font-semibold py-0.5 px-2.5 text-[10px] uppercase rounded-full border-0 ${statusColors[detailsTransfer.status]}`}
              >
                {detailsTransfer.status === 'IN_TRANSIT'
                  ? 'In Transit'
                  : detailsTransfer.status}
              </Badge>
            </div>
            <div className='px-5 py-4 space-y-4'>
              <div className='grid grid-cols-3 gap-3 text-xs'>
                <div className='bg-slate-50 rounded-xl p-3'>
                  <p className='text-slate-400 font-medium uppercase tracking-wide text-[10px] mb-0.5'>
                    From
                  </p>
                  <p className='font-semibold text-slate-900'>
                    {detailsTransfer.sourceLocation?.name}
                  </p>
                  <p className='text-[10px] font-mono text-slate-400'>
                    {detailsTransfer.sourceLocation?.code}
                  </p>
                </div>
                <div className='flex items-center justify-center'>
                  <LuArrowRight className='h-5 w-5 text-slate-400' />
                </div>
                <div className='bg-slate-50 rounded-xl p-3'>
                  <p className='text-slate-400 font-medium uppercase tracking-wide text-[10px] mb-0.5'>
                    To
                  </p>
                  <p className='font-semibold text-slate-900'>
                    {detailsTransfer.destinationLocation?.name}
                  </p>
                  <p className='text-[10px] font-mono text-slate-400'>
                    {detailsTransfer.destinationLocation?.code}
                  </p>
                </div>
              </div>
              {(detailsTransfer.items?.length ?? 0) > 0 ? (
                <div className='rounded-xl border border-slate-200 overflow-hidden'>
                  <table className='w-full text-left text-xs'>
                    <thead className='bg-slate-100 border-b border-slate-300 font-semibold text-slate-600 uppercase'>
                      <tr>
                        <th className='px-3 py-2.5'>Product</th>
                        <th className='px-3 py-2.5'>SKU</th>
                        <th className='px-3 py-2.5 text-center'>Shipped</th>
                        <th className='px-3 py-2.5 text-center'>Received</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-200'>
                      {detailsTransfer.items.map((item) => (
                        <tr key={item.id} className='hover:bg-slate-50'>
                          <td className='px-3 py-2.5 font-semibold text-slate-900'>
                            {item.product?.name}
                          </td>
                          <td className='px-3 py-2.5 font-mono text-slate-400 text-[10px]'>
                            {item.product?.sku}
                          </td>
                          <td className='px-3 py-2.5 text-center font-bold text-slate-700'>
                            {item.quantity}
                          </td>
                          <td className='px-3 py-2.5 text-center font-bold text-green-700'>
                            {item.receivedQuantity ??
                              (detailsTransfer.status === 'RECEIVED'
                                ? item.quantity
                                : '—')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className='text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200'>
                  No item details available.
                </div>
              )}
              {detailsTransfer.notes && (
                <div className='bg-slate-50 rounded-xl p-3 text-xs'>
                  <p className='text-slate-400 font-medium uppercase tracking-wide text-[10px] mb-0.5'>
                    Notes
                  </p>
                  <p className='text-slate-700 whitespace-pre-wrap'>
                    {detailsTransfer.notes}
                  </p>
                </div>
              )}
              <div className='flex justify-end gap-2 pt-1'>
                {detailsTransfer.status === 'DRAFT' && (
                  <Button
                    size='sm'
                    onClick={() => {
                      setDetailsTransfer(null);
                      setShipConfirmId(detailsTransfer.id);
                    }}
                    className='bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-4'
                  >
                    <LuTruck className='h-3.5 w-3.5 mr-1.5' /> Ship
                  </Button>
                )}
                {detailsTransfer.status === 'IN_TRANSIT' && (
                  <Button
                    size='sm'
                    onClick={() => {
                      setDetailsTransfer(null);
                      router.push(
                        `/inventory/transfers/receive/${detailsTransfer.id}`,
                      );
                    }}
                    className='bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-4'
                  >
                    <LuPackage className='h-3.5 w-3.5 mr-1.5' /> Receive
                  </Button>
                )}
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setDetailsTransfer(null)}
                  className='text-xs h-8'
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* ── Ship Confirm ── */}
      <DeleteModal
        open={!!shipConfirmId}
        onOpenChange={(o) => {
          if (!o) setShipConfirmId(null);
        }}
        title='Mark as In Transit'
        description='This will ship the transfer and deduct stock from the source location immediately. Make sure the source has sufficient stock.'
        loading={shipMutation.isPending}
        onConfirm={() => {
          if (shipConfirmId) shipMutation.mutate(shipConfirmId);
        }}
        confirmLabel='Ship Now'
        cancelLabel='Go Back'
      />

      {/* ── Cancel Confirm ── */}
      <DeleteModal
        open={!!cancelConfirmId}
        onOpenChange={(o) => {
          if (!o) setCancelConfirmId(null);
        }}
        title='Cancel Transfer'
        description='Cancelling an IN TRANSIT transfer will restore the source stock. This cannot be undone.'
        loading={cancelMutation.isPending}
        onConfirm={() => {
          if (cancelConfirmId) cancelMutation.mutate(cancelConfirmId);
        }}
        confirmLabel='Cancel Transfer'
        cancelLabel='Go Back'
      />
    </div>
  );
}
