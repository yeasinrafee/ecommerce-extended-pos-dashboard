'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LuDollarSign,
  LuShoppingCart,
  LuCreditCard,
  LuPackage,
  LuTrendingUp,
  LuCircleAlert,
  LuRefreshCw,
  LuChevronDown,
  LuChevronRight,
  LuFileText,
  LuFileSpreadsheet,
} from 'react-icons/lu';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  usePosReport,
  type PosReportQuery,
  type PosReport,
} from '@/hooks/pos.api';
import { useAllStores } from '@/hooks/store.api';
import CustomDatePicker from '@/components/FormFields/CustomDatePicker';
import Loader from '@/components/Common/Loader';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: Date | null) => {
  if (!d) return 'unknown';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const fmt = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtCount = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString();

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const thirtyDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  d.setHours(0, 0, 0, 0);
  return d;
};

const COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#f97316',
  '#0ea5e9',
  '#6366f1',
];

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  const bgMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    amber: 'bg-amber-50 border-amber-200',
    violet: 'bg-violet-50 border-violet-200',
    cyan: 'bg-cyan-50 border-cyan-200',
    rose: 'bg-rose-50 border-rose-200',
    indigo: 'bg-indigo-50 border-indigo-200',
  };
  const iconBgMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-500',
    amber: 'bg-amber-100 text-amber-600',
    violet: 'bg-violet-100 text-violet-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    rose: 'bg-rose-100 text-rose-500',
    indigo: 'bg-indigo-100 text-indigo-600',
  };

  return (
    <div
      className={`rounded-xl sm:rounded-2xl border p-3 sm:p-4 flex items-center gap-2 sm:gap-3 shadow-sm ${bgMap[color] || bgMap.blue} bg-opacity-60`}
    >
      <div
        className={`rounded-lg p-2 sm:p-2.5 shrink-0 hidden sm:flex ${iconBgMap[color] || iconBgMap.blue}`}
      >
        <Icon className='w-4 h-4 sm:w-5 sm:h-5' />
      </div>
      <div className='min-w-0'>
        <p className='text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide truncate'>
          {title}
        </p>
        <p className='text-sm sm:text-lg font-bold text-gray-800 mt-0.5'>
          {value}
        </p>
        {sub && (
          <p className='text-[10px] sm:text-[11px] text-gray-400 mt-0.5 truncate'>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function generatePDF(report: PosReport, selStart: string, selEnd: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 12;
  const contentW = pageW - margin * 2;
  let y = margin;

  const addHeader = () => {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('POS Sales Report', pageW / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${selStart} to ${selEnd}`, pageW / 2, y, {
      align: 'center',
    });
    y += 5;
    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
  };

  const sf = (n: number | null | undefined) => (Number(n) || 0).toFixed(2);

  const addSummary = () => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const items = [
      [
        `Total Orders: ${report.summary.totalOrders}`,
        `Total Revenue: BDT ${sf(report.summary.totalRevenue)}`,
      ],
      [
        `Total Paid: BDT ${sf(report.summary.totalPaid)}`,
        `Total Due: BDT ${sf(report.summary.totalDue)}`,
      ],
      [
        `Items Sold: ${report.summary.totalQuantity}`,
        `Avg Order: BDT ${sf(report.summary.averageOrderValue)}`,
      ],
      [
        `Total Discount: BDT ${sf(report.summary.totalDiscount)}`,
        `Payment Methods: ${report.paymentBreakdown.map((p) => `${p.method}: BDT ${sf(p.amount)}`).join(', ')}`,
      ],
    ];
    for (const row of items) {
      doc.text(row[0], margin, y);
      doc.text(row[1], margin + contentW / 2, y);
      y += 4;
    }
    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
  };

  const addOrdersForPeriod = (
    period: string,
    orders: PosReport['periodicBreakdown'][0]['orderDetails'],
  ) => {
    // Count total lines needed
    let totalItems = 0;
    for (const o of orders) totalItems += o.items.length;
    // header(period) + orders * (orderHeader + tableHeader) + items + separators
    const approxNeeded = 8 + orders.length * 8 + totalItems * 5;
    if (y + approxNeeded > 275) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(period, margin, y);
    y += 5;

    for (const order of orders) {
      // Order header
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      const orderLine = `Order: ${order.orderNumber} | ${order.storeName} | ${order.paymentStatus} | BDT ${order.total.toFixed(2)}`;
      doc.text(orderLine, margin, y);
      y += 4;

      // Table header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y, contentW, 4, 'F');
      doc.text('Product', margin + 1, y + 2.8);
      doc.text('Price', margin + contentW * 0.5, y + 2.8);
      doc.text('Qty', margin + contentW * 0.7, y + 2.8);
      doc.text('Total', margin + contentW * 0.85, y + 2.8);
      y += 4;

      // Items
      doc.setFont('helvetica', 'normal');
      for (let idx = 0; idx < order.items.length; idx++) {
        if (y + 4 > 280) {
          doc.addPage();
          y = margin;
        }
        const item = order.items[idx];
        if (idx % 2 === 1) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, y, contentW, 4, 'F');
        }
        const p = Number(item.price) || 0;
        const t = Number(item.total) || 0;
        doc.text(item.productName.substring(0, 40), margin + 1, y + 2.8);
        doc.text('BDT ' + p.toFixed(2), margin + contentW * 0.5, y + 2.8);
        doc.text(String(item.quantity ?? 0), margin + contentW * 0.7, y + 2.8);
        doc.text('BDT ' + t.toFixed(2), margin + contentW * 0.85, y + 2.8);
        y += 4;
      }

      // Separator
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, y, pageW - margin, y);
      y += 5;
    }
    y += 3;
  };

  addHeader();
  addSummary();

  for (const period of report.periodicBreakdown) {
    if (period.orderDetails.length > 0) {
      addOrdersForPeriod(period.period, period.orderDetails);
    }
  }

  const dateLabel = selStart + '_to_' + selEnd;
  doc.save('pos-report-' + dateLabel + '.pdf');
}

function generateExcel(report: PosReport, selStart: string, selEnd: string) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryData = [
    ['POS Sales Report'],
    [`Period: ${selStart} to ${selEnd}`],
    [],
    ['Metric', 'Value'],
    ['Total Orders', report.summary.totalOrders],
    ['Total Revenue', report.summary.totalRevenue],
    ['Total Paid', report.summary.totalPaid],
    ['Total Due', report.summary.totalDue],
    ['Items Sold', report.summary.totalQuantity],
    ['Avg Order Value', report.summary.averageOrderValue],
    ['Total Discount', report.summary.totalDiscount],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  // Sheet 2: Periodic Breakdown
  const periodicRows = [
    [
      'Period',
      'Order #',
      'Store',
      'Status',
      'Product',
      'Barcode',
      'Price',
      'Qty',
      'Total',
    ],
  ];
  for (const period of report.periodicBreakdown) {
    for (const order of period.orderDetails) {
      for (const item of order.items) {
        periodicRows.push([
          period.period,
          order.orderNumber,
          order.storeName,
          order.paymentStatus,
          item.productName,
          item.barcode,
          String(item.price ?? ''),
          String(item.quantity ?? ''),
          String(item.total ?? ''),
        ]);
      }
    }
  }
  const periodicWs = XLSX.utils.aoa_to_sheet(periodicRows);
  XLSX.utils.book_append_sheet(wb, periodicWs, 'Orders');

  // Sheet 3: Top Products
  const topProductsRows = [
    ['#', 'Product', 'Qty Sold', 'Revenue'],
    ...report.topSellingProducts.map((p) => [
      p.rank,
      p.name,
      String(p.qty),
      String(p.revenue),
    ]),
  ];
  const topProductsWs = XLSX.utils.aoa_to_sheet(topProductsRows);
  XLSX.utils.book_append_sheet(wb, topProductsWs, 'Top Products');

  const dateLabel = selStart + '_to_' + selEnd;
  XLSX.writeFile(wb, 'pos-report-' + dateLabel + '.xlsx');
}

// ─── Main Component ───────────────────────────────────────────────────────────

const PosReport: React.FC = () => {
  const [startDate, setStartDate] = useState<Date | null>(thirtyDaysAgo());
  const [endDate, setEndDate] = useState<Date | null>(today());
  const [storeId, setStoreId] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const queryParams: PosReportQuery = useMemo(() => {
    const params: PosReportQuery = {};
    if (startDate && endDate) {
      params.startDate = fmtDate(startDate);
      params.endDate = fmtDate(endDate);
    }
    if (storeId) params.storeId = storeId;
    if (paymentStatus) params.paymentStatus = paymentStatus;
    return params;
  }, [startDate, endDate, storeId, paymentStatus]);

  const { data: res, isLoading, refetch } = usePosReport(queryParams);
  const { data: stores = [] } = useAllStores();
  const report = res?.data;

  // ── expanded periods state ──
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(
    new Set(),
  );

  const togglePeriod = useCallback((period: string) => {
    setExpandedPeriods((prev) => {
      const next = new Set(prev);
      if (next.has(period)) next.delete(period);
      else next.add(period);
      return next;
    });
  }, []);

  const handleExportPDF = useCallback(() => {
    if (!report) return;
    generatePDF(report, fmtDate(startDate), fmtDate(endDate));
  }, [report, startDate, endDate]);

  const handleExportExcel = useCallback(() => {
    if (!report) return;
    generateExcel(report, fmtDate(startDate), fmtDate(endDate));
  }, [report, startDate, endDate]);

  if (!mounted) {
    return (
      <div className='flex justify-center py-20'>
        <Loader />
      </div>
    );
  }

  return (
    <div className='p-4 sm:p-6 space-y-5'>
      {/* ── Header ── */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
        <h1 className='text-xl font-bold text-gray-800'>POS Report</h1>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => refetch()}
            className='flex items-center gap-1.5 text-xs'
          >
            <LuRefreshCw className='w-3.5 h-3.5' />
            Refresh
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={handleExportPDF}
            disabled={!report}
            className='flex items-center gap-1.5 text-xs'
          >
            <LuFileText className='w-3.5 h-3.5' />
            PDF
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={handleExportExcel}
            disabled={!report}
            className='flex items-center gap-1.5 text-xs'
          >
            <LuFileSpreadsheet className='w-3.5 h-3.5' />
            Excel
          </Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <Card className='p-3 sm:p-4 border border-gray-200 rounded-xl sm:rounded-2xl shadow-sm'>
        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3'>
          <CustomDatePicker
            label='Start Date'
            value={startDate}
            max={endDate || undefined}
            onChange={(d) => {
              setStartDate(d);
              if (d && endDate && d > endDate) setEndDate(d);
            }}
          />
          <CustomDatePicker
            label='End Date'
            value={endDate}
            min={startDate || undefined}
            onChange={(d) => {
              setEndDate(d);
              if (d && startDate && d < startDate) setStartDate(d);
            }}
          />
          <div>
            <label className='block text-[11px] font-medium text-gray-500 mb-1'>
              Store
            </label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className='w-full h-9 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 px-3 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary'
            >
              <option value=''>All Stores</option>
              {stores.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className='block text-[11px] font-medium text-gray-500 mb-1'>
              Payment Status
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className='w-full h-9 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 px-3 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary'
            >
              <option value=''>All Status</option>
              <option value='PAID'>Paid</option>
              <option value='DUE'>Due</option>
              <option value='PENDING'>Pending</option>
            </select>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className='flex justify-center py-16'>
          <Loader />
        </div>
      ) : !report ? (
        <div className='flex flex-col items-center justify-center py-16 text-gray-400'>
          <LuCircleAlert className='w-12 h-12 mb-3' />
          <p className='text-sm font-medium text-gray-500'>No data available</p>
          <p className='text-xs mt-1'>Adjust filters to view POS report.</p>
        </div>
      ) : (
        <>
          {/* ── Summary Cards ── */}
          <div className='grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3'>
            <StatCard
              title='Total Revenue'
              value={`৳${fmt(report.summary.totalRevenue)}`}
              sub={`${fmtCount(report.summary.totalOrders)} orders`}
              icon={LuDollarSign}
              color='green'
            />
            <StatCard
              title='Total Paid'
              value={`৳${fmt(report.summary.totalPaid)}`}
              sub={`${report.paymentStatusDistribution.paid} paid orders`}
              icon={LuTrendingUp}
              color='blue'
            />
            <StatCard
              title='Total Due'
              value={`৳${fmt(report.summary.totalDue)}`}
              sub={`${report.paymentStatusDistribution.due} due orders`}
              icon={LuCreditCard}
              color='red'
            />
            <StatCard
              title='Items Sold'
              value={fmtCount(report.summary.totalQuantity)}
              sub={`Avg ৳${fmt(report.summary.averageOrderValue)}/order`}
              icon={LuPackage}
              color='violet'
            />
            <StatCard
              title='Total Discount'
              value={`৳${fmt(report.summary.totalDiscount)}`}
              icon={LuShoppingCart}
              color='cyan'
            />
            <StatCard
              title='Paid Orders'
              value={fmtCount(report.paymentStatusDistribution.paid)}
              sub={`${report.paymentStatusDistribution.pending} pending`}
              icon={LuTrendingUp}
              color='green'
            />
            <StatCard
              title='Due Orders'
              value={fmtCount(report.paymentStatusDistribution.due)}
              sub={`${report.paymentStatusDistribution.pending} pending`}
              icon={LuCircleAlert}
              color='rose'
            />
          </div>

          {/* ── Payment Breakdown & Top Products Row ── */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4'>
            <Card className='p-3 sm:p-5 border border-gray-200 rounded-xl sm:rounded-2xl'>
              <h2 className='text-sm font-semibold text-gray-700 mb-3'>
                Payment Method Breakdown
              </h2>
              {report.paymentBreakdown.length === 0 ? (
                <p className='text-sm text-gray-400'>No payment data</p>
              ) : (
                <div className='space-y-2.5'>
                  {report.paymentBreakdown.map((p, i) => {
                    const pct =
                      report.summary.totalRevenue > 0
                        ? (
                            (p.amount / report.summary.totalRevenue) *
                            100
                          ).toFixed(1)
                        : '0';
                    return (
                      <div key={i} className='flex items-center gap-2 sm:gap-3'>
                        <span className='text-[10px] sm:text-xs font-medium text-gray-600 w-14 sm:w-20 shrink-0 uppercase truncate'>
                          {p.method}
                        </span>
                        <div className='flex-1 h-2 bg-gray-100 rounded-full overflow-hidden'>
                          <div
                            className='h-full rounded-full transition-all'
                            style={{
                              width: `${Math.min(100, Number(pct))}%`,
                              backgroundColor: COLORS[i % COLORS.length],
                            }}
                          />
                        </div>
                        <span className='text-[10px] sm:text-xs font-semibold text-gray-700 w-16 sm:w-24 text-right shrink-0'>
                          ৳{fmt(p.amount)}
                        </span>
                        <span className='text-[10px] text-gray-400 w-8 sm:w-10 text-right shrink-0'>
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* ── Top Selling Products ── */}
            <Card className='p-3 sm:p-5 border border-gray-200 rounded-xl sm:rounded-2xl'>
              <h2 className='text-sm font-semibold text-gray-700 mb-4'>
                Top Selling Products
              </h2>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='border-b border-gray-100'>
                      <th className='text-left py-2.5 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider'>
                        #
                      </th>
                      <th className='text-left py-2.5 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider'>
                        Product
                      </th>
                      <th className='text-right py-2.5 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider'>
                        Qty Sold
                      </th>
                      <th className='text-right py-2.5 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider'>
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-50'>
                    {report.topSellingProducts.slice(0, 5).map((p) => (
                      <tr
                        key={p.productId}
                        className='hover:bg-gray-50 transition-colors'
                      >
                        <td className='py-2.5 px-2'>
                          <span
                            className={cn(
                              'inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold',
                              p.rank === 1
                                ? 'bg-yellow-100 text-yellow-600'
                                : p.rank === 2
                                  ? 'bg-slate-200 text-slate-500'
                                  : p.rank === 3
                                    ? 'bg-orange-100 text-orange-500'
                                    : 'bg-gray-100 text-gray-400',
                            )}
                          >
                            {p.rank}
                          </span>
                        </td>
                        <td className='py-2.5 px-2 font-medium text-gray-800 max-w-30 sm:max-w-none truncate'>
                          {p.name}
                        </td>
                        <td className='py-2.5 px-2 text-right text-gray-600'>
                          {fmtCount(p.qty)}
                        </td>
                        <td className='py-2.5 px-2 text-right font-semibold text-gray-800'>
                          ৳{fmt(p.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* ── Periodic Breakdown Table (expandable) ── */}
          <Card className='p-3 sm:p-5 border border-gray-200 rounded-xl sm:rounded-2xl'>
            <h2 className='text-sm font-semibold text-gray-700 mb-4'>
              Periodic Breakdown
            </h2>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b border-gray-100'>
                    <th className='w-6 py-2.5 px-1'></th>
                    <th className='text-left py-2.5 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider'>
                      Period
                    </th>
                    <th className='text-right py-2.5 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider'>
                      Orders
                    </th>
                    <th className='text-right py-2.5 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider'>
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-50'>
                  {report.periodicBreakdown.map((p, i) => (
                    <React.Fragment key={i}>
                      <tr
                        className={cn(
                          'transition-colors cursor-pointer',
                          expandedPeriods.has(p.period)
                            ? 'bg-blue-50'
                            : 'hover:bg-gray-50',
                        )}
                        onClick={() => togglePeriod(p.period)}
                      >
                        <td className='py-2.5 px-1 text-gray-400'>
                          {expandedPeriods.has(p.period) ? (
                            <LuChevronDown className='w-3.5 h-3.5' />
                          ) : (
                            <LuChevronRight className='w-3.5 h-3.5' />
                          )}
                        </td>
                        <td className='py-2.5 px-2 font-medium text-gray-700 max-w-30 sm:max-w-none truncate'>
                          {p.period}
                        </td>
                        <td className='py-2.5 px-2 text-right text-gray-600'>
                          {p.orders}
                        </td>
                        <td className='py-2.5 px-2 text-right font-semibold text-gray-800'>
                          ৳{fmt(p.revenue)}
                        </td>
                      </tr>
                      {expandedPeriods.has(p.period) && (
                        <tr className='bg-gray-50/70'>
                          <td colSpan={4} className='p-0'>
                            <div className='px-4 pb-3 pt-2 space-y-3'>
                              {p.orderDetails.map((order) => (
                                <div
                                  key={order.orderId}
                                  className='bg-white rounded-lg border border-gray-200 overflow-hidden'
                                >
                                  {/* Order header */}
                                  <div className='flex flex-wrap items-center justify-between bg-gray-100/80 px-3 py-2 border-b border-gray-200 gap-1'>
                                    <div className='flex items-center gap-2 text-[11px] sm:text-xs text-gray-600'>
                                      <span className='font-bold text-gray-800'>
                                        #{order.orderNumber}
                                      </span>
                                      <span className='text-gray-300'>|</span>
                                      <span>{order.storeName}</span>
                                      <span className='text-gray-300'>|</span>
                                      <span
                                        className={cn(
                                          'inline-block px-1.5 py-0.5 rounded text-[10px] font-medium',
                                          order.paymentStatus === 'PAID'
                                            ? 'bg-green-100 text-green-700'
                                            : order.paymentStatus === 'DUE'
                                              ? 'bg-red-100 text-red-600'
                                              : 'bg-amber-100 text-amber-600',
                                        )}
                                      >
                                        {order.paymentStatus}
                                      </span>
                                    </div>
                                    <div className='text-xs font-bold text-gray-800'>
                                      Total: {fmt(order.total)} BDT
                                    </div>
                                  </div>
                                  {/* Items table */}
                                  <table className='w-full text-xs'>
                                    <thead>
                                      <tr className='border-b border-gray-100 bg-gray-50/50'>
                                        <th className='text-left py-1.5 px-2 font-semibold text-gray-500 text-[10px] uppercase tracking-wider'>
                                          Product
                                        </th>
                                        <th className='text-left py-1.5 px-2 font-semibold text-gray-500 text-[10px] uppercase tracking-wider hidden sm:table-cell'>
                                          Barcode
                                        </th>
                                        <th className='text-right py-1.5 px-2 font-semibold text-gray-500 text-[10px] uppercase tracking-wider'>
                                          Price
                                        </th>
                                        <th className='text-center py-1.5 px-2 font-semibold text-gray-500 text-[10px] uppercase tracking-wider'>
                                          Qty
                                        </th>
                                        <th className='text-right py-1.5 px-2 font-semibold text-gray-500 text-[10px] uppercase tracking-wider'>
                                          Total
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className='divide-y divide-gray-50'>
                                      {order.items.map((item, idx) => (
                                        <tr
                                          key={idx}
                                          className='hover:bg-blue-50/40 transition-colors'
                                        >
                                          <td className='py-1.5 px-2 text-gray-800 font-medium max-w-25 sm:max-w-none truncate'>
                                            {item.productName}
                                          </td>
                                          <td className='py-1.5 px-2 text-gray-500 font-mono hidden sm:table-cell'>
                                            {item.barcode || '-'}
                                          </td>
                                          <td className='py-1.5 px-2 text-right text-gray-700'>
                                            {fmt(item.price)} BDT
                                          </td>
                                          <td className='py-1.5 px-2 text-center text-gray-700'>
                                            {item.quantity}
                                          </td>
                                          <td className='py-1.5 px-2 text-right font-semibold text-gray-800'>
                                            {fmt(item.total)} BDT
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default PosReport;
