import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { BlogRoutes } from '@/routes/blog.route';
import type { ApiResponse } from '@/types/auth';
import { toast } from 'react-hot-toast';

export interface Blog {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogDetail extends Blog {
  image?: string | null;
  authorName?: string;
  shortDescription?: string;
  content?: string;
  category?: any;
  tags?: any[];
  seos?: any[];
  user?: any;
}

export interface BlogListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PagedResult<T> {
  data: T[];
  meta: BlogListMeta;
}

type MetaRecord = Record<string, unknown>;

const toNumber = (value: unknown, fallback: number) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const normalizeMeta = (meta: MetaRecord, page: number, limit: number, fallbackTotal: number): BlogListMeta => {
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

const fetchPaginatedBlogs = async (page: number, limit: number, searchTerm?: string): Promise<PagedResult<Blog>> => {
  const response = await apiClient.get<ApiResponse<Blog[]>>(BlogRoutes.getAllPaginated, { params: { page, limit, searchTerm } });
  const blogs = ensurePayload(response.data, 'Failed to load blogs');
  const meta = normalizeMeta(response.data.meta, page, limit, blogs.length);

  return { data: blogs, meta };
};

const fetchAllBlogs = async (): Promise<Blog[]> => {
  const response = await apiClient.get<ApiResponse<Blog[]>>(BlogRoutes.getAll);
  return ensurePayload(response.data, 'Failed to load blogs');
};

export const blogKeys = {
  all: ['blogs'] as const,
  paginated: (page: number, limit: number, searchTerm?: string) => [...blogKeys.all, 'paginated', page, limit, searchTerm] as const,
  list: () => [...blogKeys.all, 'list'] as const,
  detail: (id: string) => [...blogKeys.all, 'detail', id] as const
};

export const usePaginatedBlogs = (page: number, limit = 10, searchTerm?: string) => {
  return useQuery<PagedResult<Blog>>({
    queryKey: blogKeys.paginated(page, limit, searchTerm),
    queryFn: () => fetchPaginatedBlogs(page, limit, searchTerm),
    placeholderData: keepPreviousData
  });
};

export const useAllBlogs = () => {
  return useQuery<Blog[]>({
    queryKey: blogKeys.list(),
    queryFn: fetchAllBlogs
  });
};

export const useGetBlog = (id: string) => {
  return useQuery<BlogDetail | null>({
    queryKey: blogKeys.detail(id),
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<BlogDetail>>(BlogRoutes.getById(id));
      return ensurePayload(resp.data, 'Failed to load blog');
    },
    enabled: !!id
  });
};

export const useCreateBlog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: FormData | Record<string, unknown>) => {
      let response;
      if (typeof FormData !== 'undefined' && payload instanceof FormData) {
        response = await apiClient.post<ApiResponse<BlogDetail>>(BlogRoutes.create, payload);
      } else {
        response = await apiClient.post<ApiResponse<BlogDetail>>(BlogRoutes.create, payload as object);
      }

      const data = ensurePayload(response.data, 'Failed to create blog');
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: BlogDetail }) => {
      toast.success(result.message || 'Blog created successfully');
      await queryClient.invalidateQueries({ queryKey: blogKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || 'Failed to create blog';
      toast.error(message);
    }
  });
};

export const useUpdateBlog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: FormData | Record<string, unknown> }) => {
      let response;
      if (typeof FormData !== 'undefined' && payload instanceof FormData) {
        response = await apiClient.patch<ApiResponse<BlogDetail>>(BlogRoutes.update(id), payload as FormData);
      } else {
        response = await apiClient.patch<ApiResponse<BlogDetail>>(BlogRoutes.update(id), payload as object);
      }

      const data = ensurePayload(response.data, 'Failed to update blog');
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: BlogDetail }) => {
      toast.success(result.message || 'Blog updated successfully');
      await queryClient.invalidateQueries({ queryKey: blogKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || 'Failed to update blog';
      toast.error(message);
    }
  });
};

export const useDeleteBlog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<null>>(BlogRoutes.delete(id));
      const message = response.data.message;
      return { message, id };
    },
    onSuccess: async (result: { message?: string; id: string }) => {
      toast.success(result.message || 'Blog deleted');
      await queryClient.invalidateQueries({ queryKey: blogKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || 'Failed to delete blog';
      toast.error(message);
    }
  });
};
