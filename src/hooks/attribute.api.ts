import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { AttributeRoutes } from "@/routes/attribute.route";
import type { ApiResponse } from "@/types/auth";
import { toast } from "react-hot-toast";

export interface Attribute {
  id: string;
  name: string;
  slug: string;
  values: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AttributeListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PagedResult<T> {
  data: T[];
  meta: AttributeListMeta;
}

type MetaRecord = Record<string, unknown>;

const toNumber = (value: unknown, fallback: number) => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const normalizeMeta = (meta: MetaRecord, page: number, limit: number, fallbackTotal: number): AttributeListMeta => {
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

const fetchPaginatedAttributes = async (
  page: number,
  limit: number,
  searchTerm?: string
): Promise<PagedResult<Attribute>> => {
  const response = await apiClient.get<ApiResponse<Attribute[]>>(AttributeRoutes.getAllPaginated, {
    params: { page, limit, searchTerm }
  });

  const attrs = ensurePayload(response.data, "Failed to load attributes");
  const meta = normalizeMeta(response.data.meta, page, limit, attrs.length);

  return {
    data: attrs,
    meta
  };
};

const fetchAllAttributes = async (): Promise<Attribute[]> => {
  const response = await apiClient.get<ApiResponse<Attribute[]>>(AttributeRoutes.getAll);
  return ensurePayload(response.data, "Failed to load attributes");
};

export const attributeKeys = {
  all: ["attributes"] as const,
  paginated: (page: number, limit: number, searchTerm?: string) =>
    [...attributeKeys.all, "paginated", page, limit, searchTerm] as const,
  list: () => [...attributeKeys.all, "list"] as const
};

export const usePaginatedAttributes = (
  page: number,
  limit = 10,
  searchTerm?: string
) => {
  return useQuery<PagedResult<Attribute>>({
    queryKey: attributeKeys.paginated(page, limit, searchTerm),
    queryFn: () => fetchPaginatedAttributes(page, limit, searchTerm),
    placeholderData: keepPreviousData
  });
};

export const useAllAttributes = () => {
  return useQuery<Attribute[]>({
    queryKey: attributeKeys.list(),
    queryFn: fetchAllAttributes
  });
};

export const useCreateAttribute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name: string; values?: string[] }) => {
      const response = await apiClient.post<ApiResponse<Attribute>>(AttributeRoutes.create, payload);
      const data = ensurePayload(response.data, "Failed to create attribute");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: Attribute }) => {
      toast.success(result.message || "Attribute created successfully");
      await queryClient.invalidateQueries({ queryKey: attributeKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to create attribute";
      toast.error(message);
    }
  });
};

export const useUpdateAttribute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: { name?: string; values?: string[] } }) => {
      const response = await apiClient.patch<ApiResponse<Attribute>>(AttributeRoutes.update(id), payload);
      const data = ensurePayload(response.data, "Failed to update attribute");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: Attribute }) => {
      toast.success(result.message || "Attribute updated successfully");
      await queryClient.invalidateQueries({ queryKey: attributeKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to update attribute";
      toast.error(message);
    }
  });
};

export const useDeleteAttribute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<null>>(AttributeRoutes.delete(id));
      const message = response.data.message;
      return { message, id };
    },
    onSuccess: async (result: { message?: string; id: string }) => {
      toast.success(result.message || "Attribute deleted");
      await queryClient.invalidateQueries({ queryKey: attributeKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to delete attribute";
      toast.error(message);
    }
  });
};
