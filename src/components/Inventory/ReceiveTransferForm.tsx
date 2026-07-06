'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/auth';
import {
  LuArrowLeft, LuArrowRight, LuRefreshCw, LuClipboardList,
  LuPackage, LuTriangleAlert, LuWarehouse, LuMapPin,
} from 'react-icons/lu';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { StockTransfer } from './TransferForm';

// ─── Form types ───────────────────────────────────────────────────────────────
interface ReceiveItemValue { productId: string; receivedQuantity: number; }
interface ReceiveFormValues { notes: string; items: ReceiveItemValue[]; }

// ─── Props ────────────────────────────────────────────────────────────────────
interface ReceiveTransferFormProps {
  transfer: StockTransfer;
}

export default function ReceiveTransferForm({ transfer }: ReceiveTransferFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { register, control, handleSubmit, watch, formState: { errors } } =
    useForm<ReceiveFormValues>({
      defaultValues: {
        notes: '',
        items: (transfer.items || []).map(i => ({
          productId: i.productId,
          receivedQuantity: i.quantity,
        })),
      },
    });

  const { fields } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');

  // ─── Mutation ────────────────────────────────────────────────────────────────
  const receiveMutation = useMutation({
    mutationFn: (payload: ReceiveFormValues) =>
      apiClient.patch<ApiResponse<any>>(`/stock-transfers/receive/${transfer.id}`, payload),
    onSuccess: () => {
      toast.success('Transfer received — destination stock credited');
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.push('/inventory/transfers');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to receive transfer'),
  });

  const onSubmit = (values: ReceiveFormValues) => {
    receiveMutation.mutate(values);
  };

  // ─── Derived summary ──────────────────────────────────────────────────────────
  const totalShipped  = transfer.items.reduce((s, i) => s + (i.quantity ?? 0), 0);
  const totalReceived = (watchedItems || []).reduce((s, item) => s + (Number(item.receivedQuantity) || 0), 0);
  const totalReturned = totalShipped - totalReceived;
  const hasPartial    = transfer.items.some((item, idx) =>
    (item.quantity - (Number(watchedItems?.[idx]?.receivedQuantity) || 0)) > 0
  );

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-center gap-4 bg-white px-5 sm:px-6 py-5 rounded-xl border border-slate-200 shadow-sm">
        <button type="button" onClick={() => router.push('/inventory/transfers')}
          className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors shrink-0">
          <LuArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
              Receive — {transfer.transferNumber}
            </h1>
            <Badge className="bg-blue-100 text-blue-800 border-0 text-[10px] font-bold rounded-full px-2 uppercase">
              In Transit
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter the quantity actually received. Unreceived units are automatically returned to source.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">

        {/* ══ LEFT COLUMN ══════════════════════════════════════════════════════ */}
        <div className="space-y-5 min-w-0">

          {/* ── Section 1: Route info (read-only) ── */}
          <Card className="p-5 sm:p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <LuMapPin className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-semibold text-slate-800">Transfer Route</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <LuWarehouse className="h-4 w-4 text-slate-400 shrink-0" />
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">From (Source)</p>
                </div>
                <p className="font-bold text-slate-900">{transfer.sourceLocation?.name}</p>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">{transfer.sourceLocation?.code}</p>
              </div>
              <div className="hidden sm:flex items-center justify-center">
                <div className="flex items-center gap-1">
                  <div className="w-8 h-px bg-slate-300" />
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <LuArrowRight className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="w-8 h-px bg-slate-300" />
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <LuMapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">To (Destination)</p>
                </div>
                <p className="font-bold text-slate-900">{transfer.destinationLocation?.name}</p>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">{transfer.destinationLocation?.code}</p>
              </div>
            </div>
          </Card>

          {/* ── Section 2: Items ── */}
          <Card className="border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 sm:px-6 py-4 border-b border-slate-100">
              <span className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <LuPackage className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-semibold text-slate-800">Items</h3>
              <span className="text-[11px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                {fields.length}
              </span>
            </div>

            <div className="p-4 sm:p-5 space-y-3">
              {fields.map((field, idx) => {
                const item       = transfer.items[idx];
                const received   = Number(watchedItems?.[idx]?.receivedQuantity) || 0;
                const returned   = (item?.quantity ?? 0) - received;
                const isFull     = received === item?.quantity;
                const isPartial  = received > 0 && received < (item?.quantity ?? 0);
                const isNone     = received === 0;
                const isOver     = received > (item?.quantity ?? 0);

                return (
                  <div key={field.id}
                    className={`rounded-2xl border p-4 transition-colors ${isOver ? 'border-red-200 bg-red-50/40' : 'border-slate-200 bg-white'}`}>
                    <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-4 items-center">

                      {/* Left: product info */}
                      <div className="flex items-center gap-3">
                        <span className="h-7 w-7 shrink-0 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{item?.product?.name}</p>
                          <p className="text-[11px] font-mono text-slate-400">{item?.product?.sku}</p>
                        </div>
                        <input type="hidden" {...register(`items.${idx}.productId` as const)} />
                      </div>

                      {/* Right: shipped / received input / status */}
                      <div className="grid grid-cols-[1fr_120px_1fr] gap-3 items-center lg:pl-6 lg:border-l lg:border-slate-200">
                        <div className="text-center">
                          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-0.5">Shipped</p>
                          <p className="text-base font-bold text-slate-700">{item?.quantity}</p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1 text-center">Received</p>
                          <input
                            type="number" min={0} max={item?.quantity}
                            {...register(`items.${idx}.receivedQuantity` as const, { valueAsNumber: true })}
                            className={`w-full h-10 text-center font-bold text-sm rounded-xl border outline-none transition-all
                              ${isOver
                                ? 'border-red-300 bg-red-50 text-red-700 focus:ring-4 focus:ring-red-100'
                                : 'border-slate-200 bg-white text-green-700 focus:border-primary/60 focus:ring-4 focus:ring-primary/10'
                              }`}
                          />
                        </div>

                        <div className="text-center">
                          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-0.5">Status</p>
                          {isFull    && <Badge className="bg-green-100 text-green-800 border-0 text-[10px] font-bold rounded-full px-2">Full</Badge>}
                          {isPartial && <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px] font-bold rounded-full px-2">Partial</Badge>}
                          {isNone    && <Badge className="bg-slate-100 text-slate-600 border-0 text-[10px] font-bold rounded-full px-2">Not Rcvd</Badge>}
                          {isOver    && <Badge className="bg-red-100 text-red-700 border-0 text-[10px] font-bold rounded-full px-2">Over</Badge>}
                        </div>
                      </div>
                    </div>

                    {/* Flow breakdown */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-3 text-[11px]">
                      <span className="flex items-center gap-1 text-green-700 font-medium">
                        → <strong>{received}</strong> credited to {transfer.destinationLocation?.name}
                      </span>
                      {returned > 0 && (
                        <span className="flex items-center gap-1 text-amber-700 font-medium">
                          ↩ <strong>{returned}</strong> returned to {transfer.sourceLocation?.name}
                        </span>
                      )}
                      {isOver && (
                        <span className="flex items-center gap-1 text-red-600 font-medium">
                          <LuTriangleAlert className="h-3 w-3 shrink-0" /> Cannot exceed shipped qty ({item?.quantity})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* ── Section 3: Notes ── */}
          <Card className="p-5 sm:p-6 border border-slate-200 shadow-sm">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">
                Notes <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea rows={3} placeholder="Discrepancies, damage on arrival, remarks…"
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
                <span className="font-semibold text-slate-800 text-right">{transfer.sourceLocation?.name}</span>
              </div>
              <div className="flex items-center justify-center -my-1">
                <LuArrowRight className="h-4 w-4 text-slate-300" />
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-500 shrink-0">To</span>
                <span className="font-semibold text-slate-800 text-right">{transfer.destinationLocation?.name}</span>
              </div>
              <div className="h-px bg-slate-100" />
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total shipped</span>
                <span className="font-semibold text-slate-800">{totalShipped} units</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1">
                  → Crediting to dest.
                </span>
                <span className="font-bold text-green-700">+{totalReceived} units</span>
              </div>
              {totalReturned > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    ↩ Returning to source
                  </span>
                  <span className="font-bold text-amber-600">+{totalReturned} units</span>
                </div>
              )}
            </div>

            {hasPartial && (
              <div className="mt-4 flex items-start gap-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <LuTriangleAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Partial receive detected — unreceived units will be returned to source automatically.
              </div>
            )}
          </Card>

          <Card className="p-4 border border-slate-200 shadow-sm -space-y-2">
            <Button type="submit" disabled={receiveMutation.isPending}
              className="w-full h-11 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2">
              {receiveMutation.isPending && <LuRefreshCw className="animate-spin h-4 w-4" />}
              Confirm Received
            </Button>
            <Button type="button" variant="outline"
              onClick={() => router.push('/inventory/transfers')}
              className="w-full h-11 text-sm font-semibold rounded-xl">
              Cancel
            </Button>
          </Card>
        </div>

      </form>
    </div>
  );
}
