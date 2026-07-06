'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/auth';
import SupplierReturnForm, { SupplierReturn } from '@/components/Inventory/SupplierReturnForm';
import Loader from '@/components/Common/Loader';

export default function EditSupplierReturnContent() {
  const { id } = useParams<{ id: string }>();

  const { data: ret, isLoading, isError } = useQuery({
    queryKey: ['supplier-returns', 'detail', id],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<SupplierReturn>>(`/supplier-returns/get/${id}`);
      return r.data.data as SupplierReturn;
    },
    enabled: !!id,
  });

  if (!id) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        No supplier return ID provided.
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
        Failed to load supplier return.
      </div>
    );
  }

  if (ret.status !== 'DRAFT') {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        Only DRAFT supplier returns can be edited.
      </div>
    );
  }

  return <SupplierReturnForm editingReturn={ret} />;
}
