import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { AdminRoutes } from "@/routes/admin.route";
import type { ApiResponse } from "@/types/auth";
import { toast } from "react-hot-toast";

export interface AdminUser {
  id: string;
  email: string;
  role: string;
}

export interface Admin {
  id: string;
  userId: string;
  name: string;
  image?: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  user?: AdminUser | null;
}

export interface AdminListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PagedResult<T> {
  data: T[];
  meta: AdminListMeta;
}

const toNumber = (value: unknown, fallback: number) => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const normalizeMeta = (meta: Record<string, unknown>, page: number, limit: number, fallbackTotal: number): AdminListMeta => {
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

const fetchPaginatedAdmins = async (page: number, limit: number, searchTerm?: string, status?: string): Promise<PagedResult<Admin>> => {
  const response = await apiClient.get<ApiResponse<Admin[]>>(AdminRoutes.getAllPaginated, {
    params: { page, limit, searchTerm, status }
  });

  const admins = ensurePayload(response.data, "Failed to load admins");
  const meta = normalizeMeta(response.data.meta, page, limit, admins.length);

  return { data: admins, meta };
};

const fetchAllAdmins = async (): Promise<Admin[]> => {
  const response = await apiClient.get<ApiResponse<Admin[]>>(AdminRoutes.getAll);
  return ensurePayload(response.data, "Failed to load admins");
};

export const adminKeys = {
  all: ["admins"] as const,
  profile: ["admins", "profile"] as const,
  paginated: (page: number, limit: number, searchTerm?: string, status?: string) => [...adminKeys.all, "paginated", page, limit, searchTerm, status] as const,
  list: () => [...adminKeys.all, "list"] as const
};

export const useAdminProfile = () => {
  return useQuery<Admin>({
    queryKey: adminKeys.profile,
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Admin>>(AdminRoutes.getProfile);
      return ensurePayload(response.data, "Failed to load profile");
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });
};

export const useUpdateAdminProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: FormData) => {
      const response = await apiClient.patch<ApiResponse<Admin>>(AdminRoutes.updateProfile, payload);
      return ensurePayload(response.data, "Failed to update profile");
    },
    onSuccess: (data) => {
      toast.success("Profile updated successfully");
      queryClient.setQueryData(adminKeys.profile, data);
      queryClient.invalidateQueries({ queryKey: adminKeys.profile });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update profile");
    }
  });
};

export const usePaginatedAdmins = (page: number, limit = 10, searchTerm?: string, status?: string) => {
  return useQuery<PagedResult<Admin>>({
    queryKey: adminKeys.paginated(page, limit, searchTerm, status),
    queryFn: () => fetchPaginatedAdmins(page, limit, searchTerm, status),
    placeholderData: keepPreviousData
  });
};

export const useAllAdmins = () => {
  return useQuery<Admin[]>({
    queryKey: adminKeys.list(),
    queryFn: fetchAllAdmins
  });
};

export type AdminUpdatePayload = Partial<{ name: string; email: string; status: "ACTIVE" | "INACTIVE"; image?: string | null }>;

export const useUpdateAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const response = await apiClient.patch<ApiResponse<Admin>>(AdminRoutes.update(id), payload);
      const data = ensurePayload(response.data, "Failed to update admin");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: Admin }) => {
      toast.success(result.message || "Admin updated");
      await queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to update admin";
      toast.error(message);
    }
  });
};

export const useBulkUpdateAdminStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const response = await apiClient.patch<ApiResponse<{ updated: number }>>(AdminRoutes.updateStatusBulk, { ids, status });
      const data = ensurePayload(response.data, "Failed to update statuses");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: { updated: number } }) => {
      toast.success(result.message || "Statuses updated");
      await queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to update statuses";
      toast.error(message);
    }
  });
};

export const useDeleteAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<null>>(AdminRoutes.delete(id));
      return { message: response.data.message, id };
    },
    onSuccess: async (result: { message?: string; id: string }) => {
      toast.success(result.message || "Admin deleted");
      await queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to delete admin";
      toast.error(message);
    }
  });
};

export const useCreateAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiClient.post<ApiResponse<any>>('/auth/admin/create', formData);
      const data = ensurePayload(response.data, 'Failed to create admin');
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: any }) => {
      toast.success(result.message || "Admin created");
      await queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to create admin";
      toast.error(message);
    }
  });
};
