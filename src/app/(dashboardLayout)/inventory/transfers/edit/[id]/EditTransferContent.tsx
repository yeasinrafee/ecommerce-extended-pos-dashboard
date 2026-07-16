'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/auth';
import TransferForm, { StockTransfer } from '@/components/Inventory/TransferForm';
import Loader from '@/components/Common/Loader';

export default function EditTransferContent() {
  const { id } = useParams<{ id: string }>();

  const { data: transfer, isLoading, isError } = useQuery({
    queryKey: ['transfers', 'detail', id],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<StockTransfer>>(`/stock-transfers/get/${id}`);
      return r.data.data as StockTransfer;
    },
    enabled: !!id,
  });

  if (!id) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        No transfer ID provided.
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

  if (isError || !transfer) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500 text-sm">
        Failed to load transfer.
      </div>
    );
  }

  if (transfer.status !== 'DRAFT') {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        Only DRAFT transfers can be edited.
      </div>
    );
  }

  return <TransferForm editingTransfer={transfer} />;
}
