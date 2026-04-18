import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { SupplierRoutes } from "@/routes/supplier.route";
import type { ApiResponse } from "@/types/auth";
import { toast } from "react-hot-toast";

export type SupplierStatus = "ACTIVE" | "INACTIVE";

export interface Supplier {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  companyName?: string | null;
  image?: string | null;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PagedResult<T> {
  data: T[];
  meta: SupplierListMeta;
}

export type SupplierPayload = Partial<{
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  companyName: string | null;
  image: string | null;
  status: SupplierStatus;
}>;

const toNumber = (value: unknown, fallback: number) => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const normalizeMeta = (meta: Record<string, unknown>, page: number, limit: number, fallbackTotal: number): SupplierListMeta => {
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

const fetchPaginatedSuppliers = async (page: number, limit: number, searchTerm?: string, status?: SupplierStatus): Promise<PagedResult<Supplier>> => {
  const response = await apiClient.get<ApiResponse<Supplier[]>>(SupplierRoutes.getAllPaginated, {
    params: { page, limit, searchTerm, status }
  });

  const suppliers = ensurePayload(response.data, "Failed to load suppliers");
  const meta = normalizeMeta(response.data.meta, page, limit, suppliers.length);

  return { data: suppliers, meta };
};

export const supplierKeys = {
  all: ["suppliers"] as const,
  paginated: (page: number, limit: number, searchTerm?: string, status?: SupplierStatus) => [...supplierKeys.all, "paginated", page, limit, searchTerm, status] as const,
  list: () => [...supplierKeys.all, "list"] as const
};

export const usePaginatedSuppliers = (page: number, limit = 10, searchTerm?: string, status?: SupplierStatus) => {
  return useQuery<PagedResult<Supplier>>({
    queryKey: supplierKeys.paginated(page, limit, searchTerm, status),
    queryFn: () => fetchPaginatedSuppliers(page, limit, searchTerm, status),
    placeholderData: keepPreviousData
  });
};

export const useAllSuppliers = () => {
  return useQuery<Supplier[]>({
    queryKey: supplierKeys.list(),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Supplier[]>>(SupplierRoutes.getAll);
      return ensurePayload(response.data, "Failed to load suppliers");
    }
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: FormData | SupplierPayload) => {
      const response = payload instanceof FormData
        ? await apiClient.post<ApiResponse<Supplier>>(SupplierRoutes.create, payload)
        : await apiClient.post<ApiResponse<Supplier>>(SupplierRoutes.create, payload);

      const data = ensurePayload(response.data, "Failed to create supplier");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: Supplier }) => {
      toast.success(result.message || "Supplier created");
      await queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to create supplier";
      toast.error(message);
    }
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number | string; payload: FormData | SupplierPayload }) => {
      const response = payload instanceof FormData
        ? await apiClient.patch<ApiResponse<Supplier>>(SupplierRoutes.update(id), payload)
        : await apiClient.patch<ApiResponse<Supplier>>(SupplierRoutes.update(id), payload);

      const data = ensurePayload(response.data, "Failed to update supplier");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: Supplier }) => {
      toast.success(result.message || "Supplier updated");
      await queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to update supplier";
      toast.error(message);
    }
  });
};

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number | string) => {
      const response = await apiClient.delete<ApiResponse<null>>(SupplierRoutes.delete(id));
      return { message: response.data.message, id };
    },
    onSuccess: async (result: { message?: string; id: number | string }) => {
      toast.success(result.message || "Supplier deleted");
      await queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to delete supplier";
      toast.error(message);
    }
  });
};

export const useBulkUpdateSupplierStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, status }: { ids: Array<number | string>; status: SupplierStatus }) => {
      const response = await apiClient.patch<ApiResponse<{ updated: number }>>(SupplierRoutes.updateStatusBulk, { ids, status });
      const data = ensurePayload(response.data, "Failed to update supplier statuses");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: { updated: number } }) => {
      toast.success(result.message || "Supplier statuses updated");
      await queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to update supplier statuses";
      toast.error(message);
    }
  });
};