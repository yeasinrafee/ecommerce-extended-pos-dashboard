'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  ShoppingCart,
  CreditCard,
  Package,
  Layers,
  AlertTriangle,
  Trophy,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Pie,
  PieChart,
  Cell,
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import CustomDatePicker from '../../FormFields/CustomDatePicker';
import CustomSelect from '../../FormFields/CustomSelect';
import Loader from '../../Common/Loader';
import { dashboardApis } from '@/hooks/dashboard.api';
import { useForm } from 'react-hook-form';

// ─── helpers ──────────────────────────────────────────────────────────────────

function getNext7DaysRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getMonthDateRange(month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);

const toDateStr = (d: Date) => d.toISOString().split('T')[0];

// ─── static options ───────────────────────────────────────────────────────────

const MONTHS = [
  { label: 'January', value: '1' },
  { label: 'February', value: '2' },
  { label: 'March', value: '3' },
  { label: 'April', value: '4' },
  { label: 'May', value: '5' },
  { label: 'June', value: '6' },
  { label: 'July', value: '7' },
  { label: 'August', value: '8' },
  { label: 'September', value: '9' },
  { label: 'October', value: '10' },
  { label: 'November', value: '11' },
  { label: 'December', value: '12' },
];

// Safe: these are fixed relative to current year but evaluated once at module level on client
const CURRENT_YEAR =
  typeof window !== 'undefined' ? new Date().getFullYear() : 2026;
const YEARS = Array.from({ length: 6 }, (_, i) => {
  const y = CURRENT_YEAR - 2 + i;
  return { label: y.toString(), value: y.toString() };
});

// ─── StatCard ─────────────────────────────────────────────────────────────────

interface CardProps {
  title: string;
  value: string;
  unit?: string; // e.g. "৳" or "" for counts
  sub?: string;
  icon: React.ElementType;
  cardBg: string;
  iconBg: string;
  iconColor: string;
  valueColor: string;
}

function StatCard({
  title,
  value,
  unit = '৳',
  sub,
  icon: Icon,
  cardBg,
  iconBg,
  iconColor,
  valueColor,
}: CardProps) {
  return (
    <div
      className={`${cardBg} rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-5 flex items-center gap-2 sm:gap-4`}
    >
      <div
        className={`rounded-xl p-2 sm:p-3 ${iconBg} shrink-0 hidden sm:flex`}
      >
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
      </div>
      <div className='min-w-0'>
        <p className='text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide truncate'>
          {title}
        </p>
        <p className={`text-sm sm:text-xl font-bold mt-0.5 ${valueColor}`}>
          {unit}
          {value}
        </p>
        {sub && (
          <p className='text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate'>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Chart config ─────────────────────────────────────────────────────────────

const barChartConfig = {
  posRevenue: { label: 'POS Revenue', color: '#3b82f6' },
  // webRevenue: { label: "Web Revenue", color: "#8b5cf6" }, // reserved
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const Home = () => {
  const { control, watch } = useForm({
    defaultValues: {
      month: (new Date().getMonth() + 1).toString(),
      year: new Date().getFullYear().toString(),
    },
  });

  const selectedMonth = watch('month');
  const selectedYear = watch('year');

  // null initial state avoids SSR/CSR hydration mismatch
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const { start, end } = getNext7DaysRange();
    setStartDate(start);
    setEndDate(end);
    setMounted(true);
  }, []);

  const handleMonthChange = (val: string) => {
    const { start, end } = getMonthDateRange(
      parseInt(val),
      parseInt(selectedYear),
    );
    setStartDate(start);
    setEndDate(end);
  };

  const handleYearChange = (val: string) => {
    const { start, end } = getMonthDateRange(
      parseInt(selectedMonth),
      parseInt(val),
    );
    setStartDate(start);
    setEndDate(end);
  };

  const queryParams =
    startDate && endDate
      ? { startDate: toDateStr(startDate), endDate: toDateStr(endDate) }
      : { month: selectedMonth, year: selectedYear };

  const { data: res, isLoading } = dashboardApis.useGetAnalytics(queryParams);
  const analytics = res?.data;
  const cards = analytics?.cards;

  return (
    <div className='p-3 sm:p-6 space-y-3 sm:space-y-6'>
      <h1 className='text-lg sm:text-xl font-bold text-gray-800'>
        Analytics Dashboard
      </h1>

      {/* ── Filters ── */}
      <div className='bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm p-4'>
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
          <CustomDatePicker
            label='Start Date'
            value={startDate}
            onChange={(d) => setStartDate(d)}
          />
          <CustomDatePicker
            label='End Date'
            value={endDate}
            onChange={(d) => setEndDate(d)}
          />
          <CustomSelect
            triggerClassName='bg-white'
            name='month'
            control={control}
            label='Month'
            options={MONTHS}
            placeholder='Select Month'
            onChangeCallback={handleMonthChange}
          />
          <CustomSelect
            triggerClassName='bg-white'
            name='year'
            control={control}
            label='Year'
            options={YEARS}
            placeholder='Select Year'
            onChangeCallback={handleYearChange}
          />
        </div>
      </div>

      {!mounted || isLoading ? (
        <div className='flex justify-center py-12'>
          <Loader />
        </div>
      ) : (
        <>
          {/* ── Cards ── */}
          <div className='grid grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-4'>
            <StatCard
              title='Total Revenue'
              value={fmt(cards?.totalRevenue ?? 0)}
              sub={`${cards?.totalOrders ?? 0} total orders`}
              icon={DollarSign}
              cardBg='bg-green-50'
              iconBg='bg-green-100'
              iconColor='text-green-600'
              valueColor='text-green-700'
            />
            <StatCard
              title='Total POS Order'
              value={fmt(cards?.posOrders ?? 0)}
              unit=''
              sub={`৳${fmt(cards?.posRevenue ?? 0)} revenue`}
              icon={ShoppingCart}
              cardBg='bg-blue-50'
              iconBg='bg-blue-100'
              iconColor='text-blue-600'
              valueColor='text-blue-700'
            />
            <StatCard
              title='Total Due'
              value={fmt(cards?.posDue ?? 0)}
              sub='Unpaid POS amount'
              icon={CreditCard}
              cardBg='bg-red-50'
              iconBg='bg-red-100'
              iconColor='text-red-500'
              valueColor='text-red-600'
            />
            <StatCard
              title='Total Product'
              value={fmt(cards?.totalProductsSold ?? 0)}
              unit=''
              sub='Unique products sold'
              icon={Package}
              cardBg='bg-violet-50'
              iconBg='bg-violet-100'
              iconColor='text-violet-600'
              valueColor='text-violet-700'
            />
            <StatCard
              title='Stock'
              value={fmt(cards?.totalStock ?? 0)}
              unit=''
              sub='Total units in inventory'
              icon={Layers}
              cardBg='bg-amber-50'
              iconBg='bg-amber-100'
              iconColor='text-amber-600'
              valueColor='text-amber-700'
            />
            <div className='bg-orange-50 rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-5 flex items-center gap-2 sm:gap-4'>
              <div className='rounded-xl p-2 sm:p-3 bg-orange-100 shrink-0 hidden sm:flex'>
                <AlertTriangle className='w-4 h-4 sm:w-5 sm:h-5 text-orange-500' />
              </div>
              <div className='min-w-0'>
                <p className='text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide'>
                  Low Stock
                </p>
                <p className='text-sm sm:text-xl font-bold text-orange-600 mt-0.5'>
                  {cards?.lowStockCount ?? 0}
                  <span className='text-[10px] sm:text-sm font-normal text-gray-400 ml-1'>
                    products
                  </span>
                </p>
                <p className='text-[10px] sm:text-xs text-gray-400 mt-0.5'>
                  Below minimum threshold
                </p>
              </div>
            </div>
          </div>

          {/* ── Bar Chart + Pie Chart (65/35) ── */}
          <div className='grid grid-cols-1 lg:grid-cols-[65%_35%] gap-3 sm:gap-6'>
            {/* Bar Chart — 65% */}
            <div className='bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm p-6'>
              <h2 className='text-sm font-semibold text-gray-700 mb-5'>
                Revenue Overview
              </h2>
              <ChartContainer
                config={barChartConfig}
                className='w-full h-[260px]'
              >
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart
                    data={analytics?.timelineChart ?? []}
                    margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
                    barCategoryGap='40%'
                  >
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray='3 3'
                      stroke='#f0f0f0'
                    />
                    <XAxis
                      dataKey='name'
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickMargin={8}
                      interval='preserveStartEnd'
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickMargin={8}
                      tickFormatter={(v) =>
                        `৳${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                      }
                    />
                    <Tooltip
                      content={<ChartTooltipContent />}
                      cursor={{ fill: '#f9fafb' }}
                    />
                    <Bar
                      dataKey='posRevenue'
                      fill='#3b82f6'
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
                    />
                    {/* <Bar dataKey="webRevenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={36} /> */}
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            {/* Pie Chart — 35% */}
            <div className='bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm p-6'>
              <h2 className='text-sm font-semibold text-gray-700 mb-5'>
                Top Categories
              </h2>

              {(analytics?.categoryPie?.length ?? 0) === 0 ? (
                <div className='flex items-center justify-center h-[200px] text-sm text-gray-400'>
                  No data for this period
                </div>
              ) : (
                <div className='flex flex-col items-center gap-4'>
                  <div className='w-[160px] h-[160px]'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <PieChart>
                        <Pie
                          data={analytics?.categoryPie}
                          dataKey='value'
                          nameKey='name'
                          innerRadius={44}
                          outerRadius={70}
                          paddingAngle={3}
                        >
                          {analytics?.categoryPie?.map(
                            (entry: { fill: string }, i: number) => (
                              <Cell key={i} fill={entry.fill} />
                            ),
                          )}
                        </Pie>
                        <Tooltip
                          formatter={(v: number, name: string) => [
                            `${v} units`,
                            name,
                          ]}
                          contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <ul className='w-full flex flex-col gap-2'>
                    {analytics?.categoryPie?.map(
                      (
                        d: { name: string; value: number; fill: string },
                        i: number,
                      ) => (
                        <li key={i} className='flex items-center gap-2 text-sm'>
                          <span
                            className='w-2.5 h-2.5 rounded-full shrink-0'
                            style={{ backgroundColor: d.fill }}
                          />
                          <span className='text-gray-600 truncate'>
                            {d.name}
                          </span>
                          <span className='ml-auto font-semibold text-gray-800 shrink-0 pl-2'>
                            {d.value}
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* ── Top Selling Products — full width ── */}
          <div className='bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm p-6'>
            <h2 className='text-sm font-semibold text-gray-700 mb-5'>
              Top Selling Products
            </h2>

            {(analytics?.topSellingProducts?.length ?? 0) === 0 ? (
              <div className='flex items-center justify-center h-[120px] text-sm text-gray-400'>
                No sales data for this period
              </div>
            ) : (
              <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3'>
                {analytics?.topSellingProducts?.map(
                  (p: {
                    rank: number;
                    productId: string;
                    name: string;
                    qtySold: number;
                    revenue: number;
                  }) => (
                    <div
                      key={p.productId}
                      className='flex flex-col gap-2 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors'
                    >
                      <div className='flex items-center gap-2'>
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            p.rank === 1
                              ? 'bg-yellow-100 text-yellow-600'
                              : p.rank === 2
                                ? 'bg-slate-200 text-slate-500'
                                : p.rank === 3
                                  ? 'bg-orange-100 text-orange-500'
                                  : 'bg-white border border-gray-200 text-gray-400'
                          }`}
                        >
                          {p.rank === 1 ? (
                            <Trophy className='w-3 h-3' />
                          ) : (
                            p.rank
                          )}
                        </span>
                        <span className='text-xs text-gray-500 font-medium uppercase tracking-wide'>
                          #{p.rank}
                        </span>
                      </div>
                      <p className='text-sm font-semibold text-gray-800 leading-tight line-clamp-2'>
                        {p.name}
                      </p>
                      <div className='mt-auto flex items-center justify-between'>
                        <span className='text-xs text-gray-400'>
                          {p.qtySold} sold
                        </span>
                        <span className='text-sm font-bold text-blue-600'>
                          ৳{fmt(p.revenue)}
                        </span>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Home;
