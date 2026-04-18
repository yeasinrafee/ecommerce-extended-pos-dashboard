"use client";

import React from "react";
import { Area, AreaChart as RechartsAreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "../../components/ui/chart";

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "#3b82f6",
  },
  orders: {
    label: "Orders",
    color: "#10b981",
  },
} satisfies ChartConfig;

interface AreaChartProps {
  data: { name: string; revenue: number; orders: number }[];
}

const AreaChart = ({ data }: AreaChartProps) => {
  return (
    <ChartContainer config={chartConfig} className="w-full h-full text-sans min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart
          data={data}
          margin={{
            left: 12,
            right: 12,
            top: 12,
            bottom: 12,
          }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => value.length > 5 ? value.slice(0, 5) + '..' : value}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip content={<ChartTooltipContent />} />
          <defs>
            <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          {/* <Area
            dataKey="orders"
            type="natural"
            fill="url(#fillOrders)"
            fillOpacity={0.4}
            stroke="#10b981"
            stackId="a"
          /> */}
          <Area
            dataKey="revenue"
            type="monotone"
            fill="url(#fillRevenue)"
            fillOpacity={0.4}
            stroke="#3b82f6"
            stackId="a"
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default AreaChart;

