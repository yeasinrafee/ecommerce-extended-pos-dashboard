'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/auth';
import CustomerReturnForm, { CustomerReturn } from '@/components/Inventory/CustomerReturnForm';
import Loader from '@/components/Common/Loader';

export default function EditCustomerReturnContent() {
  const { id } = useParams<{ id: string }>();

  const { data: ret, isLoading, isError } = useQuery({
    queryKey: ['customer-returns', 'detail', id],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<CustomerReturn>>(`/customer-returns/get/${id}`);
      return r.data.data as CustomerReturn;
    },
    enabled: !!id,
  });

  if (!id) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        No customer return ID provided.
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

  if (isError || !ret) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500 text-sm">
        Failed to load customer return.
      </div>
    );
  }

  if (ret.status !== 'PENDING') {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        Only PENDING customer returns can be edited.
      </div>
    );
  }

  return <CustomerReturnForm editingReturn={ret} />;
}
