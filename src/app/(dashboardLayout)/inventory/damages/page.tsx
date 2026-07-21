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
import {
  type Damage,
  reasonLabels,
  reasonBadgeColors,
} from '@/components/Inventory/DamageForm';

// ─── Status helpers ────────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-slate-100 text-slate-600',
};

export default function DamageInventoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [detailsDamage, setDetailsDamage] = useState<Damage | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<Damage | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Damage | null>(null);

  // ─── Queries ─────────────────────────────────────────────────────────────────
  const { data: damagesRes, isLoading } = useQuery({
    queryKey: [
      'damages',
      'list',
      page,
      limit,
      searchTerm,
      selectedLocation,
      selectedStatus,
    ],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>(
        '/damages/get-all-paginated',
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
        data: (Array.isArray(p.data)
          ? p.data
          : ((p.data as any)?.data ?? [])) as Damage[],
        meta: (p.meta ||
          (p.data as any)?.meta || {
            page: 1,
            totalPages: 1,
            total: 0,
            limit,
          }) as {
          page: number;
          totalPages: number;
          total: number;
          limit: number;
        },
      };
    },
  });

  const { data: locationsRes } = useQuery({
    queryKey: ['damages', 'locations'],
    queryFn: async () =>
      (await apiClient.get<ApiResponse<any[]>>('/stocks/locations/get-all'))
        .data.data,
  });

  const fetchById = async (id: string): Promise<Damage> => {
    const r = await apiClient.get<ApiResponse<Damage>>(`/damages/get/${id}`);
    return r.data.data as Damage;
  };

  // ─── Mutations ────────────────────────────────────────────────────────────────
  const completeMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<ApiResponse<any>>(`/damages/complete/${id}`),
    onSuccess: async (res) => {
      toast.success('Write-off completed — stock updated');
      setCompleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['damages'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      const data = (res as any).data?.data;
      if (data?.id) {
        try {
          setDetailsDamage(await fetchById(data.id));
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
      apiClient.patch<ApiResponse<any>>(`/damages/cancel/${id}`),
    onSuccess: () => {
      toast.success('Damage report cancelled');
      setCancelTarget(null);
      queryClient.invalidateQueries({ queryKey: ['damages'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to cancel');
      setCancelTarget(null);
    },
  });

  const handleViewClick = async (dmg: Damage) => {
    setDetailsLoading(true);
    try {
      setDetailsDamage(await fetchById(dmg.id));
    } catch {
      setDetailsDamage({ ...dmg, items: dmg.items || [] });
    } finally {
      setDetailsLoading(false);
    }
  };

  const itemsList = damagesRes?.data || [];
  const meta = damagesRes?.meta || { page: 1, totalPages: 1, total: 0, limit };

  return (
    <div className='p-0 lg:p-6 space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-xl border border-gray-100 shadow-sm'>
        <div>
          <h1 className='text-xl font-bold text-slate-800'>
            Damaged Inventory
          </h1>
          <p className='text-xs text-slate-500 mt-0.5'>
            Create a DRAFT, review items, then Complete to write off stock.
          </p>
        </div>
        <Button
          onClick={() => router.push('/inventory/damages/new')}
          className='bg-primary hover:bg-primary/90 text-white font-medium text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 self-start md:self-auto'
        >
          <LuPlus className='h-4 w-4' /> Add Damage / Loss
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
              placeholder='Search damage #…'
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
            <p className='text-sm font-medium'>No damage reports found.</p>
            <p className='text-xs text-slate-400 mt-1'>
              Create a report to log damaged or lost items.
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full border-collapse text-left'>
              <thead>
                <tr className='bg-slate-100 border-b border-slate-300 text-slate-600 font-semibold text-xs uppercase'>
                  <th className='p-4'>Damage #</th>
                  <th className='p-4'>Product(s)</th>
                  <th className='p-4'>Location</th>
                  <th className='p-4 text-center'>Total Qty</th>
                  <th className='p-4 text-center'>Reason(s)</th>
                  <th className='p-4 text-center'>Status</th>
                  <th className='p-4 hidden sm:table-cell text-center'>Date</th>
                  <th className='p-4 w-12'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-200 text-sm text-slate-700'>
                {itemsList.map((dmg: Damage) => {
                  const totalQty =
                    dmg.items?.reduce((s, i) => s + (i.quantity || 0), 0) ?? 0;
                  const reasons = [
                    ...new Set(dmg.items?.map((i) => i.reason).filter(Boolean)),
                  ];
                  return (
                    <tr
                      key={dmg.id}
                      className='hover:bg-slate-50 transition-colors'
                    >
                      <td className='p-4 font-bold text-slate-900'>
                        {dmg.damageNumber}
                      </td>
                      <td className='p-4'>
                        {dmg.items && dmg.items.length > 0 ? (
                          <div className='max-w-[200px] truncate'>
                            <p
                              className='font-semibold text-slate-900 truncate'
                              title={dmg.items
                                .map((i) => i.product?.name)
                                .filter(Boolean)
                                .join(', ')}
                            >
                              {dmg.items
                                .map((i) => i.product?.name)
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                            {dmg.items.length === 1 && (
                              <p className='text-[10px] font-mono text-slate-400'>
                                {dmg.items[0].product?.sku}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className='text-slate-400'>—</span>
                        )}
                      </td>
                      <td className='p-4 font-semibold text-slate-900'>
                        {dmg.location?.name}
                      </td>
                      <td className='p-4 text-center'>
                        {totalQty > 0 ? (
                          <span className='font-bold text-xs px-2.5 py-0.5 rounded-full bg-red-100 text-red-700'>
                            -{totalQty}
                          </span>
                        ) : (
                          <span className='text-slate-400'>—</span>
                        )}
                      </td>
                      <td className='p-4 text-center'>
                        {reasons.length > 0 ? (
                          <div className='flex flex-wrap justify-center gap-1'>
                            {reasons.slice(0, 2).map((r) => (
                              <Badge
                                key={r}
                                className={`font-semibold py-0.5 px-2 text-[10px] uppercase rounded-full border-0 ${reasonBadgeColors[r] || 'bg-slate-100 text-slate-600'}`}
                              >
                                {reasonLabels[r] || r}
                              </Badge>
                            ))}
                            {reasons.length > 2 && (
                              <span className='text-[10px] text-slate-400'>
                                +{reasons.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className='text-slate-400'>—</span>
                        )}
                      </td>
                      <td className='p-4 text-center'>
                        <Badge
                          className={`font-semibold py-0.5 px-2 text-[10px] uppercase rounded-full border-0 ${statusColors[dmg.status] || 'bg-slate-100 text-slate-600'}`}
                        >
                          {dmg.status}
                        </Badge>
                      </td>
                      <td className='p-4 hidden sm:table-cell text-slate-500 text-center'>
                        {new Date(
                          dmg.damageDate || dmg.createdAt,
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
                              onClick={() => handleViewClick(dmg)}
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
                            {dmg.status === 'DRAFT' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(
                                      `/inventory/damages/edit/${dmg.id}`,
                                    )
                                  }
                                  className='flex items-center gap-2 text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer'
                                >
                                  <Pencil className='h-3.5 w-3.5' /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setCompleteTarget(dmg)}
                                  className='flex items-center gap-2 text-green-600 focus:text-green-700 focus:bg-green-50 cursor-pointer'
                                >
                                  <LuCircleCheck className='h-3.5 w-3.5' />{' '}
                                  Complete
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setCancelTarget(dmg)}
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
                  );
                })}
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
        open={!!detailsDamage}
        onOpenChange={(o) => {
          if (!o) setDetailsDamage(null);
        }}
      >
        {detailsDamage && (
          <DialogContent className='w-full max-w-[calc(100%-1rem)] sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl sm:rounded-2xl p-0'>
            <DialogTitle className='sr-only'>Damage Report Details</DialogTitle>
            <div className='sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between gap-3'>
              <div>
                <h2 className='text-sm font-bold text-slate-900'>
                  {detailsDamage.damageNumber}
                </h2>
                <p className='text-[11px] text-slate-400 mt-0.5'>
                  {new Date(
                    detailsDamage.damageDate || detailsDamage.createdAt,
                  ).toLocaleString()}
                </p>
              </div>
              <Badge
                className={`font-semibold py-0.5 px-2.5 text-[10px] uppercase rounded-full border-0 ${statusColors[detailsDamage.status]}`}
              >
                {detailsDamage.status}
              </Badge>
            </div>

            <div className='px-5 py-4 space-y-4'>
              <div className='grid grid-cols-2 gap-3 text-xs'>
                <div className='bg-slate-50 rounded-xl p-3'>
                  <p className='text-slate-400 font-medium uppercase tracking-wide text-[10px] mb-0.5'>
                    Location
                  </p>
                  <p className='font-semibold text-slate-900'>
                    {detailsDamage.location?.name}
                  </p>
                </div>
                <div className='bg-slate-50 rounded-xl p-3'>
                  <p className='text-slate-400 font-medium uppercase tracking-wide text-[10px] mb-0.5'>
                    Date
                  </p>
                  <p className='font-semibold text-slate-900'>
                    {new Date(
                      detailsDamage.damageDate || detailsDamage.createdAt,
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {detailsDamage.notes && (
                <div className='bg-slate-50 rounded-xl p-3 text-xs'>
                  <p className='text-slate-400 font-medium uppercase tracking-wide text-[10px] mb-0.5'>
                    Notes
                  </p>
                  <p className='text-slate-700 whitespace-pre-wrap'>
                    {detailsDamage.notes}
                  </p>
                </div>
              )}

              {(detailsDamage.items?.length ?? 0) > 0 ? (
                <div className='rounded-xl border border-slate-200 overflow-hidden'>
                  <div className='overflow-x-auto'>
                    <table className='w-full text-left text-xs min-w-[480px]'>
                      <thead className='bg-slate-100 border-b border-slate-300 font-semibold text-slate-600 uppercase'>
                        <tr>
                          <th className='px-3 py-2.5'>Product</th>
                          <th className='px-3 py-2.5'>SKU</th>
                          <th className='px-3 py-2.5 text-center'>
                            Write-off Qty
                          </th>
                          <th className='px-3 py-2.5 text-center'>Reason</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-slate-200'>
                        {detailsDamage.items.map((item) => (
                          <tr key={item.id} className='hover:bg-slate-50'>
                            <td className='px-3 py-2.5'>
                              <p className='font-semibold text-slate-900'>
                                {item.product?.name}
                              </p>
                            </td>
                            <td className='px-3 py-2.5 font-mono text-slate-400 text-[10px]'>
                              {item.product?.sku}
                            </td>
                            <td className='px-3 py-2.5 text-center'>
                              <span className='font-bold text-sm text-red-600'>
                                -{item.quantity}
                              </span>
                            </td>
                            <td className='px-3 py-2.5 text-center'>
                              <Badge
                                className={`font-semibold py-0.5 px-2 text-[10px] uppercase rounded-full border-0 ${reasonBadgeColors[item.reason] || 'bg-slate-100 text-slate-600'}`}
                              >
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
                <div className='text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200'>
                  No item details available.
                </div>
              )}

              <div className='flex justify-end gap-2 pt-1'>
                {detailsDamage.status === 'DRAFT' && (
                  <Button
                    size='sm'
                    onClick={() => {
                      setDetailsDamage(null);
                      setCompleteTarget(detailsDamage);
                    }}
                    className='bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-4'
                  >
                    <LuCircleCheck className='h-3.5 w-3.5 mr-1.5' /> Complete
                    Write-off
                  </Button>
                )}
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setDetailsDamage(null)}
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
        title='Complete Write-off'
        description={`This will permanently write off stock for ${completeTarget?.items?.length ?? '?'} item(s) at "${completeTarget?.location?.name}". This action cannot be undone.`}
        loading={completeMutation.isPending}
        onConfirm={() => {
          if (completeTarget) completeMutation.mutate(completeTarget.id);
        }}
        confirmLabel='Confirm Write-off'
        cancelLabel='Go Back'
      />

      {/* Cancel Confirmation */}
      <DeleteModal
        open={!!cancelTarget}
        onOpenChange={(o) => {
          if (!o) setCancelTarget(null);
        }}
        title='Cancel Damage Report'
        description='This will cancel the draft damage report. No stock changes will be made. This action cannot be undone.'
        loading={cancelMutation.isPending}
        onConfirm={() => {
          if (cancelTarget) cancelMutation.mutate(cancelTarget.id);
        }}
        confirmLabel='Cancel Report'
        cancelLabel='Go Back'
      />
    </div>
  );
}
