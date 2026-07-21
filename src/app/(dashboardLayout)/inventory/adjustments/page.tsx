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
  LuCircleCheck,
  LuCircleX,
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
import type { StockAdjustment } from '@/components/Inventory/AdjustmentForm';

// ─── Status helpers ────────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-slate-100 text-slate-600',
};

export default function StockAdjustmentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [detailsAdj, setDetailsAdj] = useState<StockAdjustment | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<StockAdjustment | null>(
    null,
  );
  const [cancelTarget, setCancelTarget] = useState<StockAdjustment | null>(
    null,
  );

  const { data: adjustmentsRes, isLoading } = useQuery({
    queryKey: [
      'adjustments',
      'list',
      page,
      limit,
      searchTerm,
      selectedLocation,
      selectedStatus,
    ],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>(
        '/stock-adjustments/get-all-paginated',
        {
          params: {
            page,
            limit,
            searchTerm: searchTerm || undefined,
            locationId: selectedLocation || undefined,
            status: selectedStatus || undefined,
          },
        },
      );
      const p = r.data;
      return {
        data: (Array.isArray(p.data) ? p.data : []) as StockAdjustment[],
        meta: (p.meta || { page: 1, totalPages: 1, total: 0, limit }) as {
          page: number;
          totalPages: number;
          total: number;
          limit: number;
        },
      };
    },
  });

  const { data: locationsRes } = useQuery({
    queryKey: ['adjustments', 'locations'],
    queryFn: async () =>
      (await apiClient.get<ApiResponse<any[]>>('/stocks/locations/get-all'))
        .data.data,
  });

  const fetchById = async (id: string): Promise<StockAdjustment> => {
    const r = await apiClient.get<ApiResponse<StockAdjustment>>(
      `/stock-adjustments/get/${id}`,
    );
    return r.data.data as StockAdjustment;
  };

  const completeMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<ApiResponse<any>>(`/stock-adjustments/complete/${id}`),
    onSuccess: async (res) => {
      toast.success('Adjustment completed — stock updated');
      setCompleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      const data = (res as any).data?.data;
      if (data?.id) {
        try {
          setDetailsAdj(await fetchById(data.id));
        } catch {}
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to complete');
      setCompleteTarget(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<ApiResponse<any>>(`/stock-adjustments/cancel/${id}`),
    onSuccess: () => {
      toast.success('Adjustment cancelled');
      setCancelTarget(null);
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to cancel');
      setCancelTarget(null);
    },
  });

  const handleViewClick = async (adj: StockAdjustment) => {
    setDetailsLoading(true);
    try {
      setDetailsAdj(await fetchById(adj.id));
    } catch {
      setDetailsAdj({ ...adj, items: adj.items || [] });
    } finally {
      setDetailsLoading(false);
    }
  };

  const itemsList = adjustmentsRes?.data || [];
  const meta = adjustmentsRes?.meta || {
    page: 1,
    totalPages: 1,
    total: 0,
    limit,
  };

  return (
    <div className='p-0 lg:p-6 space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-xl border border-gray-100 shadow-sm'>
        <div>
          <h1 className='text-xl font-bold text-slate-800'>
            Stock Adjustments
          </h1>
          <p className='text-xs text-slate-500 mt-0.5'>
            Create a DRAFT, review quantities, then Complete to update stock.
          </p>
        </div>
        <Button
          onClick={() => router.push('/inventory/adjustments/new')}
          className='bg-primary hover:bg-primary/90 text-white font-medium text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 self-start md:self-auto'
        >
          <LuPlus className='h-4 w-4' /> New Adjustment
        </Button>
      </div>

      {/* Filters */}
      <Card className='p-4 border-slate-100 shadow-sm'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='relative'>
            <span className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400'>
              <LuSearch className='h-4 w-4' />
            </span>
            <input
              type='text'
              placeholder='Search adjustment #…'
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className='pl-9 w-96 bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border'
            />
          </div>
          <div className='flex items-center gap-3'>
            <select
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                setPage(1);
              }}
              className='w-52 bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3'
            >
              <option value=''>All Locations</option>
              {locationsRes?.map((l: any) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className='w-52 bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3'
            >
              <option value=''>All Status</option>
              <option value='DRAFT'>Draft</option>
              <option value='COMPLETED'>Completed</option>
              <option value='CANCELLED'>Cancelled</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className='border-slate-100 shadow-sm overflow-hidden'>
        {isLoading ? (
          <div className='flex h-64 items-center justify-center'>
            <Loader />
          </div>
        ) : itemsList.length === 0 ? (
          <div className='p-12 text-center text-slate-500'>
            <p className='text-sm font-medium'>No stock adjustments found.</p>
            <p className='text-xs text-slate-400 mt-1'>
              Create an adjustment to reconcile stock levels.
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full border-collapse text-left'>
              <thead>
                <tr className='bg-slate-100 border-b border-slate-300 text-slate-600 font-semibold text-xs uppercase'>
                  <th className='p-4'>Adjustment #</th>
                  <th className='p-4'>Product</th>
                  <th className='p-4'>Location</th>
                  <th className='p-4 text-center'>Before</th>
                  <th className='p-4 text-center'>Changed</th>
                  <th className='p-4 text-center'>After</th>
                  <th className='p-4 text-center'>Status</th>
                  <th className='p-4 hidden sm:table-cell text-center'>Date</th>
                  <th className='p-4 w-12'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-200 text-sm text-slate-700'>
                {itemsList.map((adj) => (
                  <tr
                    key={adj.id}
                    className='hover:bg-slate-50 transition-colors'
                  >
                    <td className='p-4 font-bold text-slate-900'>
                      {adj.adjustmentNumber}
                    </td>
                    <td className='p-4'>
                      {adj.items && adj.items.length > 0 ? (
                        <div className='max-w-[200px] truncate'>
                          <p
                            className='font-semibold text-slate-900 truncate'
                            title={adj.items
                              .map((i) => i.product?.name)
                              .filter(Boolean)
                              .join(', ')}
                          >
                            {adj.items
                              .map((i) => i.product?.name)
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                          {adj.items.length === 1 && (
                            <p className='text-[10px] font-mono text-slate-400'>
                              {adj.items[0].product?.sku}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className='text-slate-400'>—</span>
                      )}
                    </td>
                    <td className='p-4 font-semibold text-slate-900'>
                      {adj.location?.name}
                    </td>
                    <td className='p-4 text-center font-semibold text-slate-600'>
                      {adj.items && adj.items.length > 0
                        ? adj.items.reduce(
                            (s, i) => s + (i.previousQuantity || 0),
                            0,
                          )
                        : '—'}
                    </td>
                    <td className='p-4 text-center'>
                      {adj.items && adj.items.length > 0
                        ? (() => {
                            const totalChanged = adj.items.reduce(
                              (s, i) => s + (i.quantityChanged || 0),
                              0,
                            );
                            return (
                              <span
                                className={`font-bold text-xs px-2.5 py-0.5 rounded-full ${totalChanged > 0 ? 'bg-green-100 text-green-700' : totalChanged < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}
                              >
                                {totalChanged > 0
                                  ? `+${totalChanged}`
                                  : totalChanged}
                              </span>
                            );
                          })()
                        : '—'}
                    </td>
                    <td className='p-4 text-center font-bold text-primary'>
                      {adj.items && adj.items.length > 0
                        ? adj.items.reduce(
                            (s, i) => s + (i.currentQuantity || 0),
                            0,
                          )
                        : '—'}
                    </td>
                    <td className='p-4 text-center'>
                      <Badge
                        className={`font-semibold py-0.5 px-2 text-[10px] uppercase rounded-full border-0 ${statusColors[adj.status] || 'bg-slate-100 text-slate-600'}`}
                      >
                        {adj.status}
                      </Badge>
                    </td>
                    <td className='p-4 hidden sm:table-cell text-slate-500 text-center'>
                      {new Date(
                        adj.adjustmentDate || adj.createdAt,
                      ).toLocaleDateString()}
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
                            onClick={() => handleViewClick(adj)}
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
                          {adj.status === 'DRAFT' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/inventory/adjustments/edit?id=${adj.id}`,
                                  )
                                }
                                className='flex items-center gap-2 text-primary focus:text-primary/80 focus:bg-primary/5 cursor-pointer'
                              >
                                <Pencil className='h-3.5 w-3.5' /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setCompleteTarget(adj)}
                                className='flex items-center gap-2 text-green-600 focus:text-green-700 focus:bg-green-50 cursor-pointer'
                              >
                                <LuCircleCheck className='h-3.5 w-3.5' />{' '}
                                Complete
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setCancelTarget(adj)}
                                className='flex items-center gap-2 text-red-500 focus:text-red-600 focus:bg-red-50 cursor-pointer'
                              >
                                <LuCircleX className='h-3.5 w-3.5' /> Cancel
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
        open={!!detailsAdj}
        onOpenChange={(o) => {
          if (!o) setDetailsAdj(null);
        }}
      >
        {detailsAdj && (
          <DialogContent className='w-full max-w-[calc(100%-1rem)] sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl sm:rounded-2xl p-0'>
            <DialogTitle className='sr-only'>Adjustment Details</DialogTitle>
            <div className='sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between gap-3'>
              <div>
                <h2 className='text-sm font-bold text-slate-900'>
                  {detailsAdj.adjustmentNumber}
                </h2>
                <p className='text-[11px] text-slate-400 mt-0.5'>
                  {new Date(
                    detailsAdj.adjustmentDate || detailsAdj.createdAt,
                  ).toLocaleString()}
                </p>
              </div>
              <Badge
                className={`font-semibold py-0.5 px-2.5 text-[10px] uppercase rounded-full border-0 ${statusColors[detailsAdj.status]}`}
              >
                {detailsAdj.status}
              </Badge>
            </div>
            <div className='px-5 py-4 space-y-4'>
              <div className='grid grid-cols-2 gap-3 text-xs'>
                <div className='bg-slate-50 rounded-xl p-3'>
                  <p className='text-slate-400 font-medium uppercase tracking-wide text-[10px] mb-0.5'>
                    Location
                  </p>
                  <p className='font-semibold text-slate-900'>
                    {detailsAdj.location?.name}
                  </p>
                </div>
                <div className='bg-slate-50 rounded-xl p-3'>
                  <p className='text-slate-400 font-medium uppercase tracking-wide text-[10px] mb-0.5'>
                    Reason
                  </p>
                  <p className='font-semibold text-slate-900'>
                    {detailsAdj.reason || '—'}
                  </p>
                </div>
              </div>
              {(detailsAdj.items?.length ?? 0) > 0 ? (
                <div className='rounded-xl border border-slate-200 overflow-hidden'>
                  <div className='overflow-x-auto'>
                    <table className='w-full text-left text-xs min-w-[480px]'>
                      <thead className='bg-slate-100 border-b border-slate-300 font-semibold text-slate-600 uppercase'>
                        <tr>
                          <th className='px-3 py-2.5'>Product</th>
                          <th className='px-3 py-2.5 text-center'>Before</th>
                          <th className='px-3 py-2.5 text-center'>Changed</th>
                          <th className='px-3 py-2.5 text-center'>After</th>
                          <th className='px-3 py-2.5'>Reason</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-slate-200'>
                        {detailsAdj.items.map((item) => (
                          <tr key={item.id} className='hover:bg-slate-50'>
                            <td className='px-3 py-2.5'>
                              <p className='font-semibold text-slate-900'>
                                {item.product?.name}
                              </p>
                              <p className='text-[10px] font-mono text-slate-400'>
                                {item.product?.sku}
                              </p>
                            </td>
                            <td className='px-3 py-2.5 text-center font-semibold text-slate-600'>
                              {item.previousQuantity}
                            </td>
                            <td className='px-3 py-2.5 text-center'>
                              <span
                                className={`font-bold text-sm px-2 py-0.5 rounded-full ${item.quantityChanged > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                              >
                                {item.quantityChanged > 0
                                  ? `+${item.quantityChanged}`
                                  : item.quantityChanged}
                              </span>
                            </td>
                            <td className='px-3 py-2.5 text-center font-bold text-primary'>
                              {item.currentQuantity}
                            </td>
                            <td className='px-3 py-2.5 text-slate-500'>
                              {item.reason || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className='text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200'>
                  No item details available.
                </div>
              )}
              <div className='flex justify-end gap-2 pt-1'>
                {detailsAdj.status === 'DRAFT' && (
                  <Button
                    size='sm'
                    onClick={() => {
                      setDetailsAdj(null);
                      setCompleteTarget(detailsAdj);
                    }}
                    className='bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-4'
                  >
                    <LuCircleCheck className='h-3.5 w-3.5 mr-1.5' /> Complete
                  </Button>
                )}
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setDetailsAdj(null)}
                  className='text-xs h-8'
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Complete Confirmation */}
      <DeleteModal
        open={!!completeTarget}
        onOpenChange={(o) => {
          if (!o) setCompleteTarget(null);
        }}
        title='Complete Adjustment'
        description={`This will permanently update stock quantities for ${completeTarget?.items?.length ?? '?'} item(s) at "${completeTarget?.location?.name}". This action cannot be undone.`}
        loading={completeMutation.isPending}
        onConfirm={() => {
          if (completeTarget) completeMutation.mutate(completeTarget.id);
        }}
        confirmLabel='Confirm & Complete'
        cancelLabel='Go Back'
      />

      {/* Cancel Confirmation */}
      <DeleteModal
        open={!!cancelTarget}
        onOpenChange={(o) => {
          if (!o) setCancelTarget(null);
        }}
        title='Cancel Adjustment'
        description='This will cancel the draft adjustment. No stock changes will be made. This action cannot be undone.'
        loading={cancelMutation.isPending}
        onConfirm={() => {
          if (cancelTarget) cancelMutation.mutate(cancelTarget.id);
        }}
        confirmLabel='Cancel Adjustment'
        cancelLabel='Go Back'
      />
    </div>
  );
}
