import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { StoreRoutes } from "@/routes/store.route";
import type { ApiResponse } from "@/types/auth";
import { toast } from "react-hot-toast";

export type StoreStatus = "ACTIVE" | "INACTIVE";

export interface Store {
  id: string;
  name: string;
  address: string;
  status: StoreStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StoreListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PagedResult<T> {
  data: T[];
  meta: StoreListMeta;
}

export type StorePayload = Partial<{
  name: string;
  address: string;
  status: StoreStatus;
}>;

const toNumber = (value: unknown, fallback: number) => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const normalizeMeta = (meta: Record<string, unknown>, page: number, limit: number, fallbackTotal: number): StoreListMeta => {
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

const fetchPaginatedStores = async (page: number, limit: number, searchTerm?: string, status?: StoreStatus): Promise<PagedResult<Store>> => {
  const response = await apiClient.get<ApiResponse<Store[]>>(StoreRoutes.getAllPaginated, {
    params: { page, limit, searchTerm, status }
  });

  const stores = ensurePayload(response.data, "Failed to load stores");
  const meta = normalizeMeta(response.data.meta, page, limit, stores.length);

  return { data: stores, meta };
};

export const storeKeys = {
  all: ["stores"] as const,
  paginated: (page: number, limit: number, searchTerm?: string, status?: StoreStatus) => [...storeKeys.all, "paginated", page, limit, searchTerm, status] as const,
  list: () => [...storeKeys.all, "list"] as const
};

export const usePaginatedStores = (page: number, limit = 10, searchTerm?: string, status?: StoreStatus) => {
  return useQuery<PagedResult<Store>>({
    queryKey: storeKeys.paginated(page, limit, searchTerm, status),
    queryFn: () => fetchPaginatedStores(page, limit, searchTerm, status),
    placeholderData: keepPreviousData
  });
};

export const useAllStores = () => {
  return useQuery<Store[]>({
    queryKey: storeKeys.list(),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Store[]>>(StoreRoutes.getAll);
      return ensurePayload(response.data, "Failed to load stores");
    }
  });
};

export const useCreateStore = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: StorePayload) => {
      const response = await apiClient.post<ApiResponse<Store>>(StoreRoutes.create, payload);
      const data = ensurePayload(response.data, "Failed to create store");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: Store }) => {
      toast.success(result.message || "Store created");
      await queryClient.invalidateQueries({ queryKey: storeKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to create store";
      toast.error(message);
    }
  });
};

export const useUpdateStore = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: StorePayload }) => {
      const response = await apiClient.patch<ApiResponse<Store>>(StoreRoutes.update(id), payload);
      const data = ensurePayload(response.data, "Failed to update store");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: Store }) => {
      toast.success(result.message || "Store updated");
      await queryClient.invalidateQueries({ queryKey: storeKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to update store";
      toast.error(message);
    }
  });
};

export const useDeleteStore = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<null>>(StoreRoutes.delete(id));
      return { message: response.data.message, id };
    },
    onSuccess: async (result: { message?: string; id: string }) => {
      toast.success(result.message || "Store deleted");
      await queryClient.invalidateQueries({ queryKey: storeKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to delete store";
      toast.error(message);
    }
  });
};

export const useBulkUpdateStoreStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: StoreStatus }) => {
      const response = await apiClient.patch<ApiResponse<{ updated: number }>>(StoreRoutes.updateStatusBulk, { ids, status });
      const data = ensurePayload(response.data, "Failed to update store statuses");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: { updated: number } }) => {
      toast.success(result.message || "Store statuses updated");
      await queryClient.invalidateQueries({ queryKey: storeKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to update store statuses";
      toast.error(message);
    }
  });
};