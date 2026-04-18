import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { ApiResponse } from "@/types/auth";
import PromoRoutes from "@/routes/promo.route";
import { toast } from "react-hot-toast";

export interface Promo {
  id: string;
  code: string;
  discountType: "PERCENTAGE_DISCOUNT" | "FLAT_DISCOUNT" | "NONE";
  discountValue: number;
  numberOfUses: number;
  startDate: string;
  endDate: string;
}

export interface PagedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const ensurePayload = <T>(response: ApiResponse<T>, fallbackMessage: string) => {
  if (!response.success || response.data == null) {
    throw new Error(response.message || fallbackMessage);
  }
  return response.data;
};

export const usePaginatedPromos = (page: number, limit: number, searchTerm?: string) => {
  const fetchPaginated = async () => {
    const response = await apiClient.get<ApiResponse<Promo[]>>(PromoRoutes.getAllPaginated, { params: { page, limit, searchTerm } });
    const promos = ensurePayload(response.data, "Failed to load promos");
    const meta = (response.data.meta as any) ?? { page, limit, total: promos.length, totalPages: 1 };
    return { data: promos, meta } as PagedResult<Promo>;
  };

  return useQuery<PagedResult<Promo>>({
    queryKey: ["promos", page, limit, searchTerm],
    queryFn: fetchPaginated
  });
};

export const useAllPromos = () => {
  const fetchAll = async () => {
    const response = await apiClient.get<ApiResponse<Promo[]>>(PromoRoutes.getAll);
    return ensurePayload(response.data, "Failed to load promos");
  };

  return useQuery<Promo[]>({
    queryKey: ["promos", "all"],
    queryFn: fetchAll
  });
};

export const usePromo = (id: string) => {
  const fetchPromo = async () => {
    const response = await apiClient.get<ApiResponse<Promo>>(PromoRoutes.getById(id));
    return ensurePayload(response.data, "Failed to load promo");
  };

  return useQuery<Promo | null>({
    queryKey: ["promo", id],
    queryFn: fetchPromo,
    enabled: !!id
  });
};

export const useCreatePromo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      code: string;
      discountType: "PERCENTAGE_DISCOUNT" | "FLAT_DISCOUNT" | "NONE";
      discountValue: number;
      numberOfUses: number;
      startDate: string;
      endDate: string;
    }) => apiClient.post<ApiResponse<Promo>>(PromoRoutes.create, payload).then(res => ensurePayload(res.data, "Failed to create promo")),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promos"] });
    }
  });
};

export const useUpdatePromo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      apiClient.patch<ApiResponse<Promo>>(PromoRoutes.update(id), payload).then(res => ensurePayload(res.data, 'Failed to update promo')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promos"] });
      queryClient.invalidateQueries({ queryKey: ["promo"] });
    }
  });
};

export const useDeletePromo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<ApiResponse<null>>(PromoRoutes.delete(id));
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to delete promo");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promos"] });
      toast.success("Promo deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete promo");
    }
  });
};
