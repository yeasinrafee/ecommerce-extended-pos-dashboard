import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { ShippingRoutes } from "@/routes/shipping.route";
import type { ApiResponse } from "@/types/auth";
import { toast } from "react-hot-toast";

export interface Shipping {
  id: string;
  minimumFreeShippingAmount: number;
  tax: number;
  maximumWeight?: number | null;
  maximumVolume?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  chargePerWeight?: number | null;
  chargePerVolume?: number | null;
  weightUnit?: number | null;
  volumeUnit?: number | null;
  createdAt: string;
  updatedAt: string;
}

const ensurePayload = <T>(response: ApiResponse<T>, fallbackMessage: string) => {
  if (!response.success || response.data == null) {
    throw new Error(response.message || fallbackMessage);
  }

  return response.data;
};

const fetchShipping = async (): Promise<Shipping | null> => {
  try {
    const response = await apiClient.get<ApiResponse<Shipping>>(ShippingRoutes.get);
    if (!response.data.success || response.data.data == null) return null;
    return response.data.data as Shipping;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
};

export const shippingKeys = {
  all: ["shipping"] as const,
  detail: (id: string) => [...shippingKeys.all, "detail", id] as const,
};

export const useGetShipping = () => {
  return useQuery<Shipping | null>({
    queryKey: shippingKeys.all,
    queryFn: fetchShipping,
  });
};

export const useCreateShipping = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Omit<Shipping, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiClient.post<ApiResponse<Shipping>>(ShippingRoutes.create, payload);
      const data = ensurePayload(response.data, "Failed to create shipping");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: Shipping }) => {
      toast.success(result.message || "Shipping created");
      await queryClient.invalidateQueries({ queryKey: shippingKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to create shipping";
      toast.error(message);
    }
  });
};

export const useUpdateShipping = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Omit<Shipping, 'id' | 'createdAt' | 'updatedAt'>> }) => {
      const response = await apiClient.patch<ApiResponse<Shipping>>(ShippingRoutes.update(id), payload);
      const data = ensurePayload(response.data, "Failed to update shipping");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: Shipping }) => {
      toast.success(result.message || "Shipping updated");
      await queryClient.invalidateQueries({ queryKey: shippingKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to update shipping";
      toast.error(message);
    }
  });
};

export const useResetShipping = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete<ApiResponse<null>>(ShippingRoutes.reset);
      if (!response.data.success) throw new Error(response.data.message || "Failed to reset shipping");
      return response.data;
    },
    onSuccess: async (result: ApiResponse<null>) => {
      toast.success(result.message || "Shipping reset");
      queryClient.setQueryData(shippingKeys.all, null);
      await queryClient.invalidateQueries({ queryKey: shippingKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to reset shipping";
      toast.error(message);
    }
  });
};

export default {} as const;
