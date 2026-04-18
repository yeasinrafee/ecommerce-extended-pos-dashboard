import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { apiClient } from "@/lib/api";
import { OrderRoutes } from "@/routes/order.route";
import type { ApiResponse } from "@/types/auth";

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  baseAmount: number;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  finalAmount: number;
  orderStatus: "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  createdAt: string;
  expectedDeliveryDate?: string | null;
  deliveryTime?: number;
  orderItems?: any[];
  address?: {
    streetAddress?: string;
    flatNumber?: string;
    postCode?: string;
    zone?: {
      name?: string;
      zonePolicies?: Array<{
        zonePolicy?: {
          deliveryTime?: number | null;
        } | null;
      }>;
    };
  };
}

export const orderKeys = {
  all: ["orders"] as const,
  paginated: (params: any) => [...orderKeys.all, "paginated", params] as const,
  detail: (id: string) => [...orderKeys.all, "detail", id] as const
};

const ensurePayload = <T>(response: ApiResponse<T>, fallbackMessage: string) => {
  if (!response.success || response.data == null) {
    throw new Error(response.message || fallbackMessage);
  }
  return response.data;
};

export const useOrders = (params: { page?: number; limit?: number; searchTerm?: string }) => {
  return useQuery({
    queryKey: orderKeys.paginated(params),
    queryFn: async () => {
      const response = await apiClient.get(OrderRoutes.getAll, { params });
      return {
        data: (response.data as any).orders ?? [],
        meta: (response.data as any).meta
      };
    }
  });
};

export const useOrder = (id: string) => {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Order>>(OrderRoutes.getById(id));
      return ensurePayload(response.data, "Failed to fetch order details");
    },
    enabled: !!id
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiClient.patch<ApiResponse<Order>>(OrderRoutes.updateStatus(id), { status });
      return response.data;
    },
    onSuccess: (res) => {
      toast.success(res.message || "Order status updated successfully");
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Status update failed");
    }
  });
};

export const useBulkUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const requests = ids.map(id => apiClient.patch<ApiResponse<Order>>(OrderRoutes.updateStatus(id), { status }));
      const responses = await Promise.all(requests);
      return responses;
    },
    onSuccess: () => {
      toast.success("Order statuses updated successfully");
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Bulk update failed");
    }
  });
};
