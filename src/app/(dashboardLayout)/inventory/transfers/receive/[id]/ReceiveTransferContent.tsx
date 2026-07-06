'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/auth';
import ReceiveTransferForm from '@/components/Inventory/ReceiveTransferForm';
import type { StockTransfer } from '@/components/Inventory/TransferForm';
import Loader from '@/components/Common/Loader';
import { Button } from '@/components/ui/button';
import { LuArrowLeft } from 'react-icons/lu';

export default function ReceiveTransferContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

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

  if (transfer.status !== 'IN_TRANSIT') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500 text-sm">
          Only IN TRANSIT transfers can be received. This transfer is <strong>{transfer.status}</strong>.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.push('/inventory/transfers')}>
          <LuArrowLeft className="h-4 w-4 mr-1.5" /> Back to Transfers
        </Button>
      </div>
    );
  }

  return <ReceiveTransferForm transfer={transfer} />;
}
