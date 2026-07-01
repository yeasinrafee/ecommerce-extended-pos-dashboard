'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/auth';
import AdjustmentForm, { StockAdjustment } from '@/components/Inventory/AdjustmentForm';
import Loader from '@/components/Common/Loader';

export default function EditAdjustmentContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const { data: adj, isLoading, isError } = useQuery({
    queryKey: ['adjustments', 'detail', id],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<StockAdjustment>>(`/stock-adjustments/get/${id}`);
      return r.data.data as StockAdjustment;
    },
    enabled: !!id,
  });

  if (!id) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        No adjustment ID provided.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader />
      </div>
    );
  }

  if (isError || !adj) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500 text-sm">
        Failed to load adjustment.
      </div>
    );
  }

  return <AdjustmentForm editingAdj={adj} />;
}
