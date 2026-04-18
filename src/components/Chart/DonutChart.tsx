"use client";

import React from "react";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "../../components/ui/chart";

const chartConfig = {
  value: {
    label: "Orders",
  },
} satisfies ChartConfig;

interface DonutChartProps {
  type: "category" | "brand";
  data: { name: string; value: number; fill: string }[];
}

const DonutChart = ({ type, data }: DonutChartProps) => {
  return (
    <div className="w-full h-full flex flex-col min-h-[300px]">
      <ChartContainer config={chartConfig} className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltipContent />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm mt-4 pb-2">
        {data.map((entry, index) => (
          <li key={`item-${index}`} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.fill }}></span>
            <span className="text-gray-600 font-medium whitespace-nowrap">{entry.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DonutChart;

