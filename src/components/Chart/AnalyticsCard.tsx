import React from 'react';
import { LucideIcon } from 'lucide-react';

interface AnalyticsCardProps {
  title: string;
  amount: string | number;
  count: number;
  icon: LucideIcon;
  color: string;
}

const AnalyticsCard = ({ title, amount, count, icon: Icon, color }: AnalyticsCardProps) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{title}</span>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900">${amount}</h3>
        <p className="text-sm text-gray-500 mt-1">
          <span className="font-semibold text-gray-700">{count}</span> Orders
        </p>
      </div>
    </div>
  );
};

export default AnalyticsCard;
