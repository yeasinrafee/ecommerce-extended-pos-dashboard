import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { BrandRoutes } from "@/routes/brand.route";
import type { ApiResponse } from "@/types/auth";
import { toast } from "react-hot-toast";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrandDetail extends Brand {
  image?: string | null;
}

export interface BrandListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PagedResult<T> {
  data: T[];
  meta: BrandListMeta;
}

type MetaRecord = Record<string, unknown>;

const toNumber = (value: unknown, fallback: number) => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const normalizeMeta = (meta: MetaRecord, page: number, limit: number, fallbackTotal: number): BrandListMeta => {
  return {
    page: toNumber(meta.page, page),
    limit: toNumber(meta.limit, limit),
    total: toNumber(meta.total, fallbackTotal),
    totalPages: toNumber(meta.totalPages, 1)
  };
};

const ensurePayload = <T>(response: ApiResponse<T>, fallbackMessage: string) => {
  if (!response.success || response.data == null) {
    throw new Error(response.message || fallbackMessage);
  }

  return response.data;
};

const fetchPaginatedBrands = async (
  page: number,
  limit: number,
  searchTerm?: string
): Promise<PagedResult<Brand>> => {
  const response = await apiClient.get<ApiResponse<Brand[]>>(BrandRoutes.getAllPaginated, {
    params: { page, limit, searchTerm }
  });

  const brands = ensurePayload(response.data, "Failed to load brands");
  const meta = normalizeMeta(response.data.meta, page, limit, brands.length);

  return {
    data: brands,
    meta
  };
};

const fetchAllBrands = async (): Promise<Brand[]> => {
  const response = await apiClient.get<ApiResponse<Brand[]>>(BrandRoutes.getAll);
  return ensurePayload(response.data, "Failed to load brands");
};

export const brandKeys = {
  all: ["brands"] as const,
  paginated: (page: number, limit: number, searchTerm?: string) =>
    [...brandKeys.all, "paginated", page, limit, searchTerm] as const,
  list: () => [...brandKeys.all, "list"] as const
};

export const usePaginatedBrands = (
  page: number,
  limit = 10,
  searchTerm?: string
) => {
  return useQuery<PagedResult<Brand>>({
    queryKey: brandKeys.paginated(page, limit, searchTerm),
    queryFn: () => fetchPaginatedBrands(page, limit, searchTerm),
    placeholderData: keepPreviousData
  });
};

export const useAllBrands = () => {
  return useQuery<Brand[]>({
    queryKey: brandKeys.list(),
    queryFn: fetchAllBrands
  });
};

export const useCreateBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: string | FormData) => {
      let response;
      if (typeof FormData !== 'undefined' && payload instanceof FormData) {
        response = await apiClient.post<ApiResponse<Brand>>(BrandRoutes.create, payload);
      } else {
        response = await apiClient.post<ApiResponse<Brand>>(BrandRoutes.create, { name: payload });
      }
      const data = ensurePayload(response.data, "Failed to create brand");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: Brand }) => {
      toast.success(result.message || "Brand created successfully");
      await queryClient.invalidateQueries({ queryKey: brandKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to create brand";
      toast.error(message);
    }
  });
};

export const useUpdateBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: string | FormData }) => {
      let response;
      if (typeof FormData !== 'undefined' && payload instanceof FormData) {
        response = await apiClient.patch<ApiResponse<Brand>>(BrandRoutes.update(id), payload as FormData);
      } else {
        response = await apiClient.patch<ApiResponse<Brand>>(BrandRoutes.update(id), { name: payload });
      }

      const data = ensurePayload(response.data, "Failed to update brand");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: Brand }) => {
      toast.success(result.message || "Brand updated successfully");
      await queryClient.invalidateQueries({ queryKey: brandKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to update brand";
      toast.error(message);
    }
  });
};

export const useDeleteBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<null>>(BrandRoutes.delete(id));
      const message = response.data.message;
      return { message, id };
    },
    onSuccess: async (result: { message?: string; id: string }) => {
      toast.success(result.message || "Brand deleted");
      await queryClient.invalidateQueries({ queryKey: brandKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to delete brand";
      toast.error(message);
    }
  });
};
