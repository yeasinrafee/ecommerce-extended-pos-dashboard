import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { ZoneRoutes } from "@/routes/zone.route";
import type { ApiResponse } from "@/types/auth";
import { toast } from "react-hot-toast";

export interface Zone {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ZoneListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PagedResult<T> {
  data: T[];
  meta: ZoneListMeta;
}

type MetaRecord = Record<string, unknown>;

const toNumber = (value: unknown, fallback: number) => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const normalizeMeta = (meta: MetaRecord, page: number, limit: number, fallbackTotal: number): ZoneListMeta => {
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

const fetchPaginatedZones = async (
  page: number,
  limit: number,
  searchTerm?: string
): Promise<PagedResult<Zone>> => {
  const response = await apiClient.get<ApiResponse<Zone[]>>(ZoneRoutes.getAllPaginated, {
    params: { page, limit, searchTerm }
  });

  const zones = ensurePayload(response.data, "Failed to load zones");
  const meta = normalizeMeta(response.data.meta, page, limit, zones.length);

  return {
    data: zones,
    meta
  };
};

const fetchAllZones = async (): Promise<Zone[]> => {
  const response = await apiClient.get<ApiResponse<Zone[]>>(ZoneRoutes.getAll);
  return ensurePayload(response.data, "Failed to load zones");
};

export const zoneKeys = {
  all: ["zones"] as const,
  paginated: (page: number, limit: number, searchTerm?: string) =>
    [...zoneKeys.all, "paginated", page, limit, searchTerm] as const,
  list: () => [...zoneKeys.all, "list"] as const,
  available: () => [...zoneKeys.all, "available"] as const
};

export const usePaginatedZones = (
  page: number,
  limit = 10,
  searchTerm?: string
) => {
  return useQuery<PagedResult<Zone>>({
    queryKey: zoneKeys.paginated(page, limit, searchTerm),
    queryFn: () => fetchPaginatedZones(page, limit, searchTerm),
    placeholderData: keepPreviousData
  });
};

export const useAllZones = () => {
  return useQuery<Zone[]>({
    queryKey: zoneKeys.list(),
    queryFn: fetchAllZones
  });
};

const fetchAvailableZones = async (): Promise<Zone[]> => {
  const response = await apiClient.get<ApiResponse<Zone[]>>(ZoneRoutes.getAvailable);
  return ensurePayload(response.data, "Failed to load available zones");
};

export const useAvailableZones = () => {
  return useQuery<Zone[]>({
    queryKey: zoneKeys.available(),
    queryFn: fetchAvailableZones
  });
};

export const useCreateZone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const response = await apiClient.post<ApiResponse<Zone>>(ZoneRoutes.create, { name });
      const data = ensurePayload(response.data, "Failed to create zone");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: Zone }) => {
      toast.success(result.message || "Zone created successfully");
      await queryClient.invalidateQueries({ queryKey: zoneKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to create zone";
      toast.error(message);
    }
  });
};

export const useUpdateZone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const response = await apiClient.patch<ApiResponse<Zone>>(ZoneRoutes.update(id), payload);
      const data = ensurePayload(response.data, "Failed to update zone");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: Zone }) => {
      toast.success(result.message || "Zone updated successfully");
      await queryClient.invalidateQueries({ queryKey: zoneKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to update zone";
      toast.error(message);
    }
  });
};

export const useDeleteZone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<null>>(ZoneRoutes.delete(id));
      const message = response.data.message;
      return { message, id };
    },
    onSuccess: async (result: { message?: string; id: string }) => {
      toast.success(result.message || "Zone deleted");
      await queryClient.invalidateQueries({ queryKey: zoneKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to delete zone";
      toast.error(message);
    }
  });
};
