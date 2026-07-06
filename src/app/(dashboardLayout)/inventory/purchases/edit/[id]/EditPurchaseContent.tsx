'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/auth';
import PurchaseOrderForm, { PurchaseOrder } from '@/components/Inventory/PurchaseOrderForm';
import Loader from '@/components/Common/Loader';

export default function EditPurchaseContent() {
  const { id } = useParams<{ id: string }>();

  const { data: po, isLoading, isError } = useQuery({
    queryKey: ['purchases', 'detail', id],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<PurchaseOrder>>(`/purchase-orders/get/${id}`);
      return r.data.data as PurchaseOrder;
    },
    enabled: !!id,
  });

  if (!id) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        No purchase order ID provided.
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

  if (isError || !po) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500 text-sm">
        Failed to load purchase order.
      </div>
    );
  }

  if (po.status !== 'DRAFT') {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        Only DRAFT purchase orders can be edited.
      </div>
    );
  }

  return <PurchaseOrderForm editingPO={po} />;
}
