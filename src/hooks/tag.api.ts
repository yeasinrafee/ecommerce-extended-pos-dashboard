import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { TagRoutes } from "@/routes/tag.route";
import type { ApiResponse } from "@/types/auth";
import { toast } from "react-hot-toast";

export interface Tag {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface TagListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PagedResult<T> {
  data: T[];
  meta: TagListMeta;
}

type MetaRecord = Record<string, unknown>;

const toNumber = (value: unknown, fallback: number) => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const normalizeMeta = (meta: MetaRecord, page: number, limit: number, fallbackTotal: number): TagListMeta => {
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

const fetchPaginatedTags = async (
  page: number,
  limit: number,
  searchTerm?: string
): Promise<PagedResult<Tag>> => {
  const response = await apiClient.get<ApiResponse<Tag[]>>(TagRoutes.getAllPaginated, {
    params: { page, limit, searchTerm }
  });

  const tags = ensurePayload(response.data, "Failed to load tags");
  const meta = normalizeMeta(response.data.meta, page, limit, tags.length);

  return {
    data: tags,
    meta
  };
};

const fetchAllTags = async (): Promise<Tag[]> => {
  const response = await apiClient.get<ApiResponse<Tag[]>>(TagRoutes.getAll);
  return ensurePayload(response.data, "Failed to load tags");
};

export const tagKeys = {
  all: ["tags"] as const,
  paginated: (page: number, limit: number, searchTerm?: string) =>
    [...tagKeys.all, "paginated", page, limit, searchTerm] as const,
  list: () => [...tagKeys.all, "list"] as const
};

export const usePaginatedTags = (
  page: number,
  limit = 10,
  searchTerm?: string
) => {
  return useQuery<PagedResult<Tag>>({
    queryKey: tagKeys.paginated(page, limit, searchTerm),
    queryFn: () => fetchPaginatedTags(page, limit, searchTerm),
    placeholderData: keepPreviousData
  });
};

export const useAllTags = () => {
  return useQuery<Tag[]>({
    queryKey: tagKeys.list(),
    queryFn: fetchAllTags
  });
};

export const useCreateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const response = await apiClient.post<ApiResponse<Tag>>(TagRoutes.create, { name });
      const data = ensurePayload(response.data, "Failed to create tag");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: Tag }) => {
      toast.success(result.message || "Tag created successfully");
      await queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to create tag";
      toast.error(message);
    }
  });
};

export const useUpdateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await apiClient.patch<ApiResponse<Tag>>(TagRoutes.update(id), { name });
      const data = ensurePayload(response.data, "Failed to update tag");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: Tag }) => {
      toast.success(result.message || "Tag updated successfully");
      await queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to update tag";
      toast.error(message);
    }
  });
};

export const useDeleteTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<null>>(TagRoutes.delete(id));
      const message = response.data.message;
      return { message, id };
    },
    onSuccess: async (result: { message?: string; id: string }) => {
      toast.success(result.message || "Tag deleted");
      await queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to delete tag";
      toast.error(message);
    }
  });
};
