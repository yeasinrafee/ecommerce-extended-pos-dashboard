import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { apiClient } from "@/lib/api";
import { CustomerRoutes } from "@/routes/customer.route";
import type { ApiResponse } from "@/types/auth";

export interface Customer {
  id: string;
  userId: string;
  image?: string | null;
  phone?: string | null;
  status: "ACTIVE" | "INACTIVE";
  user: {
    email: string;
    verified: boolean;
  };
  createdAt: string;
}

export const customerKeys = {
  all: ["customers"] as const,
  paginated: (params: any) => [...customerKeys.all, "paginated", params] as const
};

const ensurePayload = <T>(response: ApiResponse<T>, fallbackMessage: string) => {
  if (!response.success || response.data == null) {
    throw new Error(response.message || fallbackMessage);
  }
  return response.data;
};

export const useCustomers = (params: { page?: number; limit?: number; searchTerm?: string; status?: string }) => {
  return useQuery({
    queryKey: customerKeys.paginated(params),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Customer[]>>(CustomerRoutes.getPaginated, { params });
      const data = ensurePayload(response.data, "Failed to fetch customers");
      return {
        data,
        meta: response.data.meta
      };
    }
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FormData) => {
      const response = await apiClient.patch<ApiResponse<Customer>>(CustomerRoutes.updateSelf, payload);
      return ensurePayload(response.data, "Failed to update profile");
    },
    onSuccess: () => {
      toast.success("Profile updated successfully");
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Update failed");
    }
  });
};

export const useUpdateCustomerStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiClient.patch<ApiResponse<null>>(CustomerRoutes.bulkStatusUpdate, { ids: [id], status });
      return response.data;
    },
    onSuccess: (res) => {
      toast.success(res.message || "Status updated successfully");
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Status update failed");
    }
  });
};

export const useBulkUpdateCustomerStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { ids: string[]; status: string }) => {
      const response = await apiClient.patch<ApiResponse<null>>(CustomerRoutes.bulkStatusUpdate, payload);
      return response.data;
    },
    onSuccess: (res) => {
      toast.success(res.message || "Status updated successfully");
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Status update failed");
    }
  });
};
