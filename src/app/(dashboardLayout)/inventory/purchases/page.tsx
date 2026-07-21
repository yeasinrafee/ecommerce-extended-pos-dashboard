'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/auth';
import {
  LuSearch,
  LuPlus,
  LuRefreshCw,
  LuShoppingCart,
  LuPencil,
  LuBan,
  LuCircleCheck,
  LuX,
  LuEye,
} from 'react-icons/lu';
import { MoreHorizontal } from 'lucide-react';
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

// ─── Types ─────────────────────────────────────────────────────────────────────

interface POItem {
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

interface PurchaseOrder {
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

// ─── Status helpers ────────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-700',
};

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function PurchaseOrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  const [detailsPO, setDetailsPO] = useState<PurchaseOrder | null>(null);
  const [actionConfirmTarget, setActionConfirmTarget] = useState<{
    id: string;
    action: 'approve' | 'cancel';
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: poRes, isLoading: isLoadingPOs } = useQuery({
    queryKey: [
      'purchases',
      'list',
      page,
      limit,
      searchTerm,
      selectedStatus,
      selectedSupplier,
      selectedLocation,
    ],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<any>>(
        '/purchase-orders/get-all-paginated',
        {
          params: {
            page,
            limit,
            searchTerm: searchTerm || undefined,
            status: selectedStatus || undefined,
            supplierId: selectedSupplier || undefined,
            locationId: selectedLocation || undefined,
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

  const { data: suppliersRes } = useQuery({
    queryKey: ['purchases', 'suppliers'],
    queryFn: async () =>
      (await apiClient.get<ApiResponse<any[]>>('/suppliers/get-all')).data.data,
  });

  const { data: locationsRes } = useQuery({
    queryKey: ['purchases', 'locations'],
    queryFn: async () =>
      (await apiClient.get<ApiResponse<any[]>>('/stocks/locations/get-all'))
        .data.data,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const approvePOMutation = useMutation({
    mutationFn: async (id: string) =>
      (
        await apiClient.patch<ApiResponse<any>>(
          `/purchase-orders/approve/${id}`,
        )
      ).data,
    onSuccess: () => {
      toast.success('Purchase Order approved');
      setActionConfirmTarget(null);
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to approve PO'),
  });

  const cancelPOMutation = useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.patch<ApiResponse<any>>(`/purchase-orders/cancel/${id}`))
        .data,
    onSuccess: () => {
      toast.success('Purchase Order cancelled');
      setActionConfirmTarget(null);
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to cancel PO'),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleViewDetails = async (po: PurchaseOrder) => {
    setDetailsLoading(true);
    try {
      const full = await apiClient.get<ApiResponse<PurchaseOrder>>(
        `/purchase-orders/get/${po.id}`,
      );
      setDetailsPO(full.data.data as PurchaseOrder);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleActionConfirm = () => {
    if (!actionConfirmTarget) return;
    if (actionConfirmTarget.action === 'approve')
      approvePOMutation.mutate(actionConfirmTarget.id);
    else cancelPOMutation.mutate(actionConfirmTarget.id);
  };

  const itemsList: PurchaseOrder[] = poRes?.data || [];
  const meta = poRes?.meta || { page: 1, totalPages: 1, total: 0, limit };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className='p-0 lg:p-6 space-y-6'>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-xl border border-gray-100 shadow-sm'>
        <div>
          <h1 className='text-xl font-bold text-slate-800'>Purchase Orders</h1>
          <p className='text-xs text-slate-500 mt-0.5'>
            Create, review, approve and track vendor procurement workflows.
          </p>
        </div>
        <Button
          onClick={() => router.push('/inventory/purchases/new')}
          className='bg-primary hover:bg-primary/90 text-white font-medium text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 self-start md:self-auto'
        >
          <LuPlus className='h-4 w-4' /> New Purchase Order
        </Button>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <Card className='p-4 border-slate-100 shadow-sm'>
        <div className='flex flex-wrap items-center gap-3'>
          <div className='relative flex-1 min-w-[200px]'>
            <span className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400'>
              <LuSearch className='h-4 w-4' />
            </span>
            <input
              type='text'
              placeholder='Search PO number, supplier…'
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className='pl-9 w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all'
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className='w-44 bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3'
          >
            <option value=''>All Status</option>
            <option value='DRAFT'>Draft</option>
            <option value='PENDING'>Pending</option>
            <option value='APPROVED'>Approved</option>
            <option value='CANCELLED'>Cancelled</option>
          </select>
          <select
            value={selectedSupplier}
            onChange={(e) => {
              setSelectedSupplier(e.target.value);
              setPage(1);
            }}
            className='w-44 bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3'
          >
            <option value=''>All Suppliers</option>
            {suppliersRes?.map((sup: any) => (
              <option key={sup.id} value={sup.id}>
                {sup.name}
              </option>
            ))}
          </select>
          <select
            value={selectedLocation}
            onChange={(e) => {
              setSelectedLocation(e.target.value);
              setPage(1);
            }}
            className='w-44 bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3'
          >
            <option value=''>All Locations</option>
            {locationsRes?.map((loc: any) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          {(searchTerm ||
            selectedStatus ||
            selectedSupplier ||
            selectedLocation) && (
            <button
              type='button'
              onClick={() => {
                setSearchTerm('');
                setSelectedStatus('');
                setSelectedSupplier('');
                setSelectedLocation('');
                setPage(1);
              }}
              className='h-10 w-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors shrink-0'
              title='Reset filters'
            >
              <LuX className='h-4 w-4' />
            </button>
          )}
        </div>
      </Card>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <Card className='border-slate-100 shadow-sm overflow-hidden'>
        {isLoadingPOs ? (
          <div className='flex h-64 items-center justify-center'>
            <Loader />
          </div>
        ) : itemsList.length === 0 ? (
          <div className='p-12 text-center text-slate-500'>
            <LuShoppingCart className='h-10 w-10 text-slate-200 mx-auto mb-2' />
            <p className='text-sm font-medium'>No purchase orders found.</p>
            <p className='text-xs text-slate-400 mt-1'>
              Try resetting filters or create a new order.
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full border-collapse text-left'>
              <thead>
                <tr className='bg-slate-100 border-b border-slate-300 text-slate-600 font-semibold text-xs uppercase'>
                  <th className='p-4'>PO Number</th>
                  <th className='p-4'>Supplier</th>
                  <th className='p-4 hidden sm:table-cell'>Location</th>
                  <th className='p-4 hidden lg:table-cell'>Order Date</th>
                  <th className='p-4 hidden lg:table-cell'>Expected</th>
                  <th className='p-4 text-right'>Net Amount</th>
                  <th className='p-4 text-center'>Status</th>
                  <th className='p-4 w-12'></th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-200 text-sm text-slate-700'>
                {itemsList.map((po) => (
                  <tr
                    key={po.id}
                    className='hover:bg-slate-50 transition-colors'
                  >
                    <td className='p-4 font-bold text-slate-900'>
                      {po.poNumber}
                    </td>
                    <td className='p-4'>
                      <div className='font-medium text-slate-900'>
                        {po.supplier?.name}
                      </div>
                      <div className='text-[10px] text-slate-400'>
                        {po.supplier?.companyName}
                      </div>
                    </td>
                    <td className='p-4 hidden sm:table-cell text-slate-600'>
                      {po.location?.name}
                    </td>
                    <td className='p-4 hidden lg:table-cell text-slate-500'>
                      {new Date(po.orderDate).toLocaleDateString()}
                    </td>
                    <td className='p-4 hidden lg:table-cell text-slate-500'>
                      {po.expectedDate ? (
                        new Date(po.expectedDate).toLocaleDateString()
                      ) : (
                        <span className='text-slate-300'>—</span>
                      )}
                    </td>
                    <td className='p-4 text-right font-semibold text-slate-900'>
                      ৳{(Number(po.netAmount) || 0).toFixed(2)}
                    </td>
                    <td className='p-4 text-center'>
                      <Badge
                        className={`font-semibold py-0.5 px-2 text-[10px] uppercase rounded-full border-0 ${statusColors[po.status] || 'bg-slate-100 text-slate-700'}`}
                      >
                        {po.status}
                      </Badge>
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
                            onClick={() => handleViewDetails(po)}
                            className='flex items-center gap-2 text-slate-600 cursor-pointer'
                          >
                            <LuEye className='h-3.5 w-3.5' />
                            View Details
                          </DropdownMenuItem>
                          {po.status === 'DRAFT' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/inventory/purchases/edit/${po.id}`,
                                  )
                                }
                                className='flex items-center gap-2 text-primary focus:text-primary focus:bg-primary/10 cursor-pointer'
                              >
                                <LuPencil className='h-3.5 w-3.5' />
                                Edit Order
                              </DropdownMenuItem>
                            </>
                          )}
                          {(po.status === 'DRAFT' ||
                            po.status === 'PENDING') && (
                            <DropdownMenuItem
                              onClick={() =>
                                setActionConfirmTarget({
                                  id: po.id,
                                  action: 'approve',
                                })
                              }
                              className='flex items-center gap-2 text-green-600 focus:text-green-700 focus:bg-green-50 cursor-pointer'
                            >
                              <LuCircleCheck className='h-3.5 w-3.5' /> Approve
                              PO
                            </DropdownMenuItem>
                          )}
                          {(po.status === 'DRAFT' ||
                            po.status === 'PENDING') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  setActionConfirmTarget({
                                    id: po.id,
                                    action: 'cancel',
                                  })
                                }
                                className='flex items-center gap-2 text-red-500 focus:text-red-600 focus:bg-red-50 cursor-pointer'
                              >
                                <LuBan className='h-3.5 w-3.5' /> Cancel Order
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
            <div className='p-4 border-t border-slate-100 flex items-center justify-between'>
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

      {/* ── View Details Dialog ──────────────────────────────────────────────── */}
      <Dialog open={!!detailsPO} onOpenChange={() => setDetailsPO(null)}>
        <DialogContent className='w-full max-w-[calc(100%-1rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl sm:rounded-2xl p-0'>
          <DialogTitle className='sr-only'>PO Details</DialogTitle>

          {/* Sticky header */}
          <div className='sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-4'>
            <div className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-3'>
                <div className='w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0'>
                  <LuShoppingCart className='h-4 w-4 text-indigo-600' />
                </div>
                <div>
                  <h2 className='text-sm font-bold text-slate-900'>
                    {detailsPO?.poNumber}
                  </h2>
                  <p className='text-[11px] text-slate-400 mt-0.5'>
                    Purchase Order Details
                  </p>
                </div>
              </div>
              {detailsPO && (
                <Badge
                  className={`font-semibold py-0.5 px-2.5 text-[10px] uppercase rounded-full border-0 shrink-0 ${statusColors[detailsPO.status]}`}
                >
                  {detailsPO.status}
                </Badge>
              )}
            </div>
          </div>

          {detailsPO && (
            <div className='px-5 py-4 space-y-4'>
              {/* Meta grid */}
              <div className='grid grid-cols-2 gap-3 text-xs'>
                <div className='bg-slate-50 rounded-xl p-3 space-y-0.5'>
                  <p className='text-slate-400 font-medium uppercase tracking-wide text-[10px]'>
                    Supplier
                  </p>
                  <p className='font-semibold text-slate-900'>
                    {detailsPO.supplier?.name}
                  </p>
                  {detailsPO.supplier?.companyName && (
                    <p className='text-[10px] text-slate-400'>
                      {detailsPO.supplier.companyName}
                    </p>
                  )}
                </div>
                <div className='bg-slate-50 rounded-xl p-3 space-y-0.5'>
                  <p className='text-slate-400 font-medium uppercase tracking-wide text-[10px]'>
                    Location
                  </p>
                  <p className='font-semibold text-slate-900'>
                    {detailsPO.location?.name}
                  </p>
                </div>
                <div className='bg-slate-50 rounded-xl p-3 space-y-0.5'>
                  <p className='text-slate-400 font-medium uppercase tracking-wide text-[10px]'>
                    Order Date
                  </p>
                  <p className='font-semibold text-slate-900'>
                    {new Date(detailsPO.orderDate).toLocaleDateString()}
                  </p>
                </div>
                <div className='bg-slate-50 rounded-xl p-3 space-y-0.5'>
                  <p className='text-slate-400 font-medium uppercase tracking-wide text-[10px]'>
                    Expected Delivery
                  </p>
                  <p className='font-semibold text-slate-900'>
                    {detailsPO.expectedDate
                      ? new Date(detailsPO.expectedDate).toLocaleDateString()
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Items table */}
              <div className='rounded-xl border border-slate-200 overflow-hidden'>
                <div className='overflow-x-auto'>
                  <table className='w-full text-left text-xs min-w-[520px]'>
                    <thead className='bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase'>
                      <tr>
                        <th className='px-3 py-2.5'>Product</th>
                        <th className='px-3 py-2.5 text-center'>Ordered</th>
                        <th className='px-3 py-2.5 text-center'>Received</th>
                        <th className='px-3 py-2.5 text-center'>Unit Cost</th>
                        <th className='px-3 py-2.5 text-center'>Tax / Disc</th>
                        <th className='px-3 py-2.5 text-right'>Line Total</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100'>
                      {detailsPO.items.map((item) => (
                        <tr key={item.id} className='hover:bg-slate-50'>
                          <td className='px-3 py-2'>
                            <p className='font-medium text-slate-900 truncate max-w-[160px]'>
                              {item.product?.name}
                            </p>
                            <p className='text-[10px] font-mono text-slate-400'>
                              {item.product?.sku || '—'}
                            </p>
                          </td>
                          <td className='px-3 py-2 text-center font-semibold text-slate-800'>
                            {item.quantity}
                          </td>
                          <td className='px-3 py-2 text-center text-slate-500'>
                            {item.receivedQuantity}
                          </td>
                          <td className='px-3 py-2 text-center text-slate-700'>
                            ৳{(Number(item.unitPrice) || 0).toFixed(2)}
                          </td>
                          <td className='px-3 py-2 text-center text-slate-400'>
                            +{item.taxPercent}% / −{item.discountPercent}%
                          </td>
                          <td className='px-3 py-2 text-right font-semibold text-slate-900'>
                            ৳{(Number(item.totalAmount) || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {detailsPO.notes && (
                <div className='bg-slate-50 rounded-xl border border-slate-200 p-3'>
                  <p className='text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1'>
                    Internal Notes
                  </p>
                  <p className='text-xs text-slate-700 whitespace-pre-wrap'>
                    {detailsPO.notes}
                  </p>
                </div>
              )}

              {/* Totals */}
              <div className='flex justify-end'>
                <div className='w-56 text-xs space-y-1.5'>
                  <div className='flex justify-between text-emerald-600'>
                    <span>Tax</span>
                    <span>
                      +৳{(Number(detailsPO.taxAmount) || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className='flex justify-between text-red-500'>
                    <span>Discount</span>
                    <span>
                      −৳{(Number(detailsPO.discountAmount) || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className='border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900 text-sm'>
                    <span>Net Amount</span>
                    <span>
                      ৳{(Number(detailsPO.netAmount) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Workflow stepper */}
              <div className='border-t border-slate-100 pt-3'>
                <p className='text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2.5'>
                  PO Workflow
                </p>
                <div className='flex items-center gap-2 flex-wrap'>
                  {(['DRAFT', 'PENDING', 'APPROVED'] as const).map(
                    (step, i) => {
                      const active = detailsPO.status === step;
                      const done =
                        step === 'PENDING' && detailsPO.status === 'APPROVED';
                      return (
                        <React.Fragment key={step}>
                          {i > 0 && (
                            <div className='h-0.5 w-6 bg-slate-200 shrink-0' />
                          )}
                          <div className='flex items-center gap-1'>
                            <div
                              className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px]
                            ${
                              active
                                ? step === 'APPROVED'
                                  ? 'bg-green-500 text-white'
                                  : step === 'PENDING'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-indigo-600 text-white'
                                : done
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'bg-slate-100 text-slate-400'
                            }`}
                            >
                              {i + 1}
                            </div>
                            <span
                              className={`text-xs font-semibold ${active || done ? 'text-slate-800' : 'text-slate-400'}`}
                            >
                              {step}
                            </span>
                          </div>
                        </React.Fragment>
                      );
                    },
                  )}
                  {detailsPO.status === 'CANCELLED' && (
                    <>
                      <div className='h-0.5 w-6 bg-red-200 shrink-0' />
                      <div className='flex items-center gap-1'>
                        <div className='h-5 w-5 bg-red-100 text-red-700 rounded-full flex items-center justify-center font-bold text-[10px]'>
                          ✕
                        </div>
                        <span className='text-xs font-semibold text-red-600'>
                          CANCELLED
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className='flex justify-end pt-1'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setDetailsPO(null)}
                  className='text-xs h-8 rounded-lg'
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Confirm Action ───────────────────────────────────────────────────── */}
      <DeleteModal
        open={!!actionConfirmTarget}
        onOpenChange={(o) => {
          if (!o) setActionConfirmTarget(null);
        }}
        title={
          actionConfirmTarget?.action === 'approve'
            ? 'Approve Purchase Order'
            : 'Cancel Purchase Order'
        }
        description={
          actionConfirmTarget?.action === 'approve'
            ? 'Are you sure you want to approve this PO? Stock will update once a GRN is created against it.'
            : 'Are you sure you want to cancel this PO? This cannot be undone if items have been received.'
        }
        loading={approvePOMutation.isPending || cancelPOMutation.isPending}
        onConfirm={handleActionConfirm}
        confirmLabel={
          actionConfirmTarget?.action === 'approve' ? 'Approve' : 'Cancel Order'
        }
        cancelLabel='Go Back'
      />
    </div>
  );
}
