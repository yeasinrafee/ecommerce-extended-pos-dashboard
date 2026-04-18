import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { ProductCategoryRoutes } from "@/routes/product-category.route";
import type { ApiResponse } from "@/types/auth";
import { toast } from "react-hot-toast";

export interface Category {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string | null;
  image?: string | null;
  subCategories?: Category[];
}

export interface CategoryListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PagedResult<T> {
  data: T[];
  meta: CategoryListMeta;
}

type MetaRecord = Record<string, unknown>;

const toNumber = (value: unknown, fallback: number) => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const normalizeMeta = (meta: MetaRecord, page: number, limit: number, fallbackTotal: number): CategoryListMeta => {
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

const fetchPaginatedCategories = async (
  page: number,
  limit: number,
  searchTerm?: string
): Promise<PagedResult<Category>> => {
  const response = await apiClient.get<ApiResponse<Category[]>>(ProductCategoryRoutes.getAllPaginated, {
    params: { page, limit, searchTerm }
  });

  const categories = ensurePayload(response.data, "Failed to load categories");
  const meta = normalizeMeta(response.data.meta, page, limit, categories.length);

  return {
    data: categories,
    meta
  };
};

const fetchParentPaginatedCategories = async (
  page: number,
  limit: number,
  searchTerm?: string
): Promise<PagedResult<Category>> => {
  const response = await apiClient.get<ApiResponse<Category[]>>(ProductCategoryRoutes.getParentPaginated, {
    params: { page, limit, searchTerm }
  });

  const categories = ensurePayload(response.data, "Failed to load categories");
  const meta = normalizeMeta(response.data.meta, page, limit, categories.length);

  return {
    data: categories,
    meta
  };
};

const fetchAllCategories = async (): Promise<Category[]> => {
  const response = await apiClient.get<ApiResponse<Category[]>>(ProductCategoryRoutes.getAll);
  return ensurePayload(response.data, "Failed to load categories");
};

export const categoryKeys = {
  all: ["categories"] as const,
  paginated: (page: number, limit: number, searchTerm?: string) =>
    [...categoryKeys.all, "paginated", page, limit, searchTerm] as const,
  list: () => [...categoryKeys.all, "list"] as const
};

export const usePaginatedCategories = (
  page: number,
  limit = 10,
  searchTerm?: string
) => {
  return useQuery<PagedResult<Category>>({
    queryKey: categoryKeys.paginated(page, limit, searchTerm),
    queryFn: () => fetchPaginatedCategories(page, limit, searchTerm),
    placeholderData: keepPreviousData
  });
};

export const useParentPaginatedCategories = (
  page: number,
  limit = 10,
  searchTerm?: string
) => {
  return useQuery<PagedResult<Category>>({
    queryKey: [...categoryKeys.all, "parent-paginated", page, limit, searchTerm] as const,
    queryFn: () => fetchParentPaginatedCategories(page, limit, searchTerm),
    placeholderData: keepPreviousData
  });
};

export const useAllCategories = () => {
  return useQuery<Category[]>({
    queryKey: categoryKeys.list(),
    queryFn: fetchAllCategories
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: string | FormData | { name: string; parentId?: string | null }) => {
      let response;
      if (typeof FormData !== 'undefined' && payload instanceof FormData) {
        response = await apiClient.post<ApiResponse<Category>>(ProductCategoryRoutes.create, payload);
      } else {
        const body = typeof payload === 'string' ? { name: payload } : payload;
        response = await apiClient.post<ApiResponse<Category>>(ProductCategoryRoutes.create, body);
      }
      const data = ensurePayload(response.data, "Failed to create category");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: Category }) => {
      toast.success(result.message || "Category created successfully");
      await queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to create category";
      toast.error(message);
    }
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: string | FormData | { name?: string; parentId?: string | null } }) => {
      let response;
      if (typeof FormData !== 'undefined' && payload instanceof FormData) {
        response = await apiClient.patch<ApiResponse<Category>>(ProductCategoryRoutes.update(id), payload as FormData);
      } else {
        const body = typeof payload === 'string' ? { name: payload } : payload;
        response = await apiClient.patch<ApiResponse<Category>>(ProductCategoryRoutes.update(id), body);
      }
      const data = ensurePayload(response.data, "Failed to update category");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: Category }) => {
      toast.success(result.message || "Category updated successfully");
      await queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to update category";
      toast.error(message);
    }
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<null>>(ProductCategoryRoutes.delete(id));
      const message = response.data.message;
      return { message, id };
    },
    onSuccess: async (result: { message?: string; id: string }) => {
      toast.success(result.message || "Category deleted");
      await queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to delete category";
      toast.error(message);
    }
  });
};
