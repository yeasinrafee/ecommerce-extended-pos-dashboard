import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { apiClient } from "@/lib/api";
import type { ApiResponse } from "@/types/auth";
import { LocationRoutes } from "@/routes/location.route";

export type LocationType = "STORE" | "WAREHOUSE";
export type Status = "ACTIVE" | "INACTIVE";

export interface Location {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  address?: string | null;
  phone?: string | null;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface LocationListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PagedResult<T> {
  data: T[];
  meta: LocationListMeta;
}

export type LocationPayload = Partial<{
  name: string;
  code: string;
  type: LocationType;
  address: string | null;
  phone: string | null;
  status: Status;
}>;

const toNumber = (value: unknown, fallback: number) => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const normalizeMeta = (meta: Record<string, unknown>, page: number, limit: number, fallbackTotal: number): LocationListMeta => {
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

const fetchPaginatedLocations = async (
  page: number,
  limit: number,
  searchTerm?: string,
  type?: LocationType,
  status?: Status
): Promise<PagedResult<Location>> => {
  const response = await apiClient.get<ApiResponse<Location[]>>(LocationRoutes.getAllPaginated, {
    params: { page, limit, searchTerm, type, status }
  });

  const locations = ensurePayload(response.data, "Failed to load locations");
  const meta = normalizeMeta(response.data.meta as Record<string, unknown>, page, limit, locations.length);

  return { data: locations, meta };
};

export const locationKeys = {
  all: ["locations"] as const,
  paginated: (page: number, limit: number, searchTerm?: string, type?: LocationType, status?: Status) =>
    [...locationKeys.all, "paginated", page, limit, searchTerm, type, status] as const,
  list: () => [...locationKeys.all, "list"] as const
};

export const usePaginatedLocations = (
  page: number,
  limit = 10,
  searchTerm?: string,
  type?: LocationType,
  status?: Status
) => {
  return useQuery<PagedResult<Location>>({
    queryKey: locationKeys.paginated(page, limit, searchTerm, type, status),
    queryFn: () => fetchPaginatedLocations(page, limit, searchTerm, type, status),
    placeholderData: keepPreviousData
  });
};

export const useAllLocations = () => {
  return useQuery<Location[]>({
    queryKey: locationKeys.list(),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Location[]>>(LocationRoutes.getAll);
      return ensurePayload(response.data, "Failed to load locations");
    }
  });
};

export const useCreateLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: LocationPayload) => {
      const response = await apiClient.post<ApiResponse<Location>>(LocationRoutes.create, payload);
      const data = ensurePayload(response.data, "Failed to create location");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: Location }) => {
      toast.success(result.message || "Location created successfully");
      await queryClient.invalidateQueries({ queryKey: locationKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to create location";
      toast.error(message);
    }
  });
};

export const useUpdateLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: LocationPayload }) => {
      const response = await apiClient.patch<ApiResponse<Location>>(LocationRoutes.update(id), payload);
      const data = ensurePayload(response.data, "Failed to update location");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: Location }) => {
      toast.success(result.message || "Location updated successfully");
      await queryClient.invalidateQueries({ queryKey: locationKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to update location";
      toast.error(message);
    }
  });
};

export const useDeleteLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<null>>(LocationRoutes.delete(id));
      return { message: response.data.message, id };
    },
    onSuccess: async (result: { message?: string; id: string }) => {
      toast.success(result.message || "Location deleted successfully");
      await queryClient.invalidateQueries({ queryKey: locationKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to delete location";
      toast.error(message);
    }
  });
};
