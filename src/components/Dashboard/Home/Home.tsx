import React, { useState } from "react";
import { DollarSign, ShoppingCart, Clock, CheckCircle2 } from "lucide-react";
import CustomDatePicker from "../../FormFields/CustomDatePicker";
import CustomSelect from "../../FormFields/CustomSelect";
import AnalyticsCard from "../../Chart/AnalyticsCard";
import AreaChart from "../../Chart/AreaChart";
import DonutChart from "../../Chart/DonutChart";
import { dashboardApis } from "@/hooks/dashboard.api"; 
import Loader from "../../Common/Loader";

import { useForm } from "react-hook-form";

const Home = () => {
  const { control, watch } = useForm({
    defaultValues: {
      month: (new Date().getMonth() + 1).toString(),
      year: new Date().getFullYear().toString(),
    },
  });

  const selectedMonth = watch("month");
  const selectedYear = watch("year");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const { data: analyticsRes, isLoading } = dashboardApis.useGetAnalytics({
    month: selectedMonth,
    year: selectedYear,
    ...(startDate && endDate ? { startDate: startDate.toISOString(), endDate: endDate.toISOString() } : {}),
  });

  const analytics = analyticsRes?.data;
  
  const months = [
    { label: "January", value: "1" },
    { label: "February", value: "2" },
    { label: "March", value: "3" },
    { label: "April", value: "4" },
    { label: "May", value: "5" },
    { label: "June", value: "6" },
    { label: "July", value: "7" },
    { label: "August", value: "8" },
    { label: "September", value: "9" },
    { label: "October", value: "10" },
    { label: "November", value: "11" },
    { label: "December", value: "12" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => {
    const year = currentYear - 5 + i;
    return { label: year.toString(), value: year.toString() };
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">
          Analytics Dashboard
        </h1>
      </div>

      <div className="grid grid-cols-2 lg:flex lg:justify-start gap-3 font-medium items-end">
        <div className="w-full lg:w-56">
          <CustomDatePicker
            label="Start Date"
            value={startDate ?? null}
            onChange={(date) => setStartDate(date ?? undefined)}
          />
        </div>
        <div className="w-full lg:w-56">
          <CustomDatePicker
            label="End Date"
            value={endDate ?? null}
            onChange={(date) => setEndDate(date ?? undefined)}
          />
        </div>
        <div className="w-full lg:w-40">
          <CustomSelect
            triggerClassName="bg-white"
            name="month"
            control={control}
            label="Month"
            options={months}
            placeholder="Select Month"
          />
        </div>
        <div className="w-full lg:w-32">
          <CustomSelect
            triggerClassName="bg-white"
            name="year"
            control={control}
            label="Year"
            options={years}
            placeholder="Select Year"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnalyticsCard
          title="Total Revenue"
          amount={analytics?.cards?.totalRevenue?.toFixed(2) || "0"}
          count={analytics?.cards?.totalOrders || 0}
          icon={DollarSign}
          color="bg-blue-500"
        />
        <AnalyticsCard
          title="Pending Orders"
          amount={analytics?.cards?.pendingOrdersRevenue?.toFixed(2) || "0"}
          count={analytics?.cards?.pendingOrdersCount || 0}
          icon={Clock}
          color="bg-orange-500"
        />
        <AnalyticsCard
          title="Confirmed Orders"
          amount={analytics?.cards?.confirmedOrdersRevenue?.toFixed(2) || "0"}
          count={analytics?.cards?.confirmedOrdersCount || 0}
          icon={ShoppingCart}
          color="bg-purple-500"
        />
        <AnalyticsCard
          title="Delivered Orders"
          amount={analytics?.cards?.deliveredOrdersRevenue?.toFixed(2) || "0"}
          count={analytics?.cards?.deliveredOrdersCount || 0}
          icon={CheckCircle2}
          color="bg-green-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 font-sans">
            Revenue Overview
          </h2>
          <div className="w-full h-[300px] sm:h-[350px] md:h-[400px] lg:h-[450px]">
            {isLoading ? <Loader /> : <AreaChart data={analytics?.areaChartData || []} />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 font-sans">
            Orders by Category
          </h2>
          <div className="w-full flex-grow min-h-[300px]">
            {isLoading ? <Loader /> : <DonutChart type="category" data={analytics?.categoryData || []} />}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 font-sans">
            Orders by Brand
          </h2>
          <div className="w-full flex-grow min-h-[300px]">
            {isLoading ? <Loader /> : <DonutChart type="brand" data={analytics?.brandData || []} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
