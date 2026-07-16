'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/auth';
import DamageForm, { Damage } from '@/components/Inventory/DamageForm';
import Loader from '@/components/Common/Loader';

export default function EditDamageContent() {
  const params = useParams();
  const id = params?.id as string | undefined;

  const { data: dmg, isLoading, isError } = useQuery({
    queryKey: ['damages', 'detail', id],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<Damage>>(`/damages/get/${id}`);
      return r.data.data as Damage;
    },
    enabled: !!id,
  });

  if (!id) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        No damage report ID provided.
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

  if (isError || !dmg) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500 text-sm">
        Failed to load damage report.
      </div>
    );
  }

  return <DamageForm editingDmg={dmg} />;
}
