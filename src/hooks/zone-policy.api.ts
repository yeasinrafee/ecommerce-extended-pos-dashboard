import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { ZonePolicyRoutes } from "@/routes/zone-policy.route";
import type { ApiResponse } from "@/types/auth";
import { toast } from "react-hot-toast";

export interface ZonePolicy {
  id: string;
  policyName: string;
  deliveryTime: number;
  shippingCost: number;
  status?: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  zones?: { zoneId: string; zone: { id: string; name: string } }[];
}

export interface ZonePolicyListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PagedResult<T> {
  data: T[];
  meta: ZonePolicyListMeta;
}

type MetaRecord = Record<string, unknown>;

const toNumber = (value: unknown, fallback: number) => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const normalizeMeta = (meta: MetaRecord, page: number, limit: number, fallbackTotal: number): ZonePolicyListMeta => {
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

const fetchPaginatedZonePolicies = async (
  page: number,
  limit: number,
  searchTerm?: string
): Promise<PagedResult<ZonePolicy>> => {
  const response = await apiClient.get<ApiResponse<ZonePolicy[]>>(ZonePolicyRoutes.getAllPaginated, {
    params: { page, limit, searchTerm }
  });

  const items = ensurePayload(response.data, "Failed to load zone policies");
  const meta = normalizeMeta(response.data.meta, page, limit, items.length);

  return {
    data: items,
    meta
  };
};

const fetchAllZonePolicies = async (): Promise<ZonePolicy[]> => {
  const response = await apiClient.get<ApiResponse<ZonePolicy[]>>(ZonePolicyRoutes.getAll);
  return ensurePayload(response.data, "Failed to load zone policies");
};

export const zonePolicyKeys = {
  all: ["zonePolicies"] as const,
  paginated: (page: number, limit: number, searchTerm?: string) =>
    [...zonePolicyKeys.all, "paginated", page, limit, searchTerm] as const,
  list: () => [...zonePolicyKeys.all, "list"] as const
};

export const usePaginatedZonePolicies = (
  page: number,
  limit = 10,
  searchTerm?: string
) => {
  return useQuery<PagedResult<ZonePolicy>>({
    queryKey: zonePolicyKeys.paginated(page, limit, searchTerm),
    queryFn: () => fetchPaginatedZonePolicies(page, limit, searchTerm),
    placeholderData: keepPreviousData
  });
};

export const useAllZonePolicies = () => {
  return useQuery<ZonePolicy[]>({
    queryKey: zonePolicyKeys.list(),
    queryFn: fetchAllZonePolicies
  });
};

export const useCreateZonePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { policyName: string; deliveryTime: number; shippingCost: number; status?: "ACTIVE" | "INACTIVE"; zoneIds?: string[] }) => {
      const response = await apiClient.post<ApiResponse<ZonePolicy>>(ZonePolicyRoutes.create, payload);
      const data = ensurePayload(response.data, "Failed to create zone policy");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: ZonePolicy }) => {
      toast.success(result.message || "Zone policy created");
      await queryClient.invalidateQueries({ queryKey: zonePolicyKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to create zone policy";
      toast.error(message);
    }
  });
};

export const useUpdateZonePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const response = await apiClient.patch<ApiResponse<ZonePolicy>>(ZonePolicyRoutes.update(id), payload);
      const data = ensurePayload(response.data, "Failed to update zone policy");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: ZonePolicy }) => {
      toast.success(result.message || "Zone policy updated");
      await queryClient.invalidateQueries({ queryKey: zonePolicyKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to update zone policy";
      toast.error(message);
    }
  });
};

export const useDeleteZonePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<null>>(ZonePolicyRoutes.delete(id));
      const message = response.data.message;
      return { message, id };
    },
    onSuccess: async (result: { message?: string; id: string }) => {
      toast.success(result.message || "Zone policy deleted");
      await queryClient.invalidateQueries({ queryKey: zonePolicyKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to delete zone policy";
      toast.error(message);
    }
  });
};

export const useBulkUpdateZonePolicies = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: "ACTIVE" | "INACTIVE" }) => {
      const response = await apiClient.patch<ApiResponse<{ updated: number }>>(ZonePolicyRoutes.bulkUpdateStatus, { ids, status });
      const data = ensurePayload(response.data, "Failed to update zone policies");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: { updated: number } }) => {
      toast.success(result.message || "Zone policies updated");
      await queryClient.invalidateQueries({ queryKey: zonePolicyKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to update zone policies";
      toast.error(message);
    }
  });
};
