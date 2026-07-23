import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/lib/api';
import { PosCustomerRoutes } from '@/routes/pos-customer.route';
import type { ApiResponse } from '@/types/auth';

/* ──────────────────────────── types ──────────────────────────── */

export interface PosCustomer {
  id: string;
  name: string;
  phone: string;
  isDeleted: boolean;
  posOrderIds: string[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    posOrders: number;
  };
}

export interface PosCustomerOrderItem {
  id: string;
  productName: string;
  productSku: string;
  productImage: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  variations: {
    attributeValue: string;
  }[];
}

export interface PosCustomerOrderSummary {
  id: string;
  invoiceNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  totalQuantity: number;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: 'PAID' | 'PENDING' | 'DUE';
  createdAt: string;
  processedBy: {
    userId: string;
    adminName: string | null;
  } | null;
  items: PosCustomerOrderItem[];
}

/* ──────────────────────────── query keys ──────────────────────────── */

export const posCustomerKeys = {
  all: ['pos-customers'] as const,
  paginated: (params: Record<string, unknown>) =>
    [...posCustomerKeys.all, 'paginated', params] as const,
  detail: (id: string) => [...posCustomerKeys.all, 'detail', id] as const,
  orders: (id: string, params: Record<string, unknown>) =>
    [...posCustomerKeys.all, 'orders', id, params] as const,
};

/* ──────────────────────────── helpers ──────────────────────────── */

const ensurePayload = <T>(
  response: ApiResponse<T>,
  fallbackMessage: string,
) => {
  if (!response.success || response.data == null) {
    throw new Error(response.message || fallbackMessage);
  }
  return response.data;
};

/* ──────────────────────────── hooks ──────────────────────────── */

export const usePosCustomers = (params: {
  page?: number;
  limit?: number;
  searchTerm?: string;
}) => {
  return useQuery({
    queryKey: posCustomerKeys.paginated(params),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<PosCustomer[]>>(
        PosCustomerRoutes.getPaginated,
        { params },
      );
      const data = ensurePayload(
        response.data,
        'Failed to fetch pos customers',
      );
      return {
        data,
        meta: response.data.meta as {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        },
      };
    },
  });
};

export const usePosCustomer = (id: string) => {
  return useQuery({
    queryKey: posCustomerKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<PosCustomer>>(
        PosCustomerRoutes.getById(id),
      );
      return ensurePayload(response.data, 'Failed to fetch pos customer');
    },
    enabled: !!id,
  });
};

export const usePosCustomerOrders = (
  customerId: string,
  params: { page?: number; limit?: number } = {},
) => {
  return useQuery({
    queryKey: posCustomerKeys.orders(customerId, params),
    queryFn: async () => {
      const response = await apiClient.get<
        ApiResponse<PosCustomerOrderSummary[]>
      >(PosCustomerRoutes.getOrders(customerId), { params });
      const data = ensurePayload(
        response.data,
        'Failed to fetch customer orders',
      );
      return {
        data,
        meta: response.data.meta as {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        },
      };
    },
    enabled: !!customerId,
  });
};

export const useCreatePosCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; phone: string }) => {
      const response = await apiClient.post<ApiResponse<PosCustomer>>(
        PosCustomerRoutes.create,
        payload,
      );
      return ensurePayload(response.data, 'Failed to create pos customer');
    },
    onSuccess: () => {
      toast.success('POS customer created');
      queryClient.invalidateQueries({ queryKey: posCustomerKeys.all });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || err.message || 'Create failed',
      );
    },
  });
};

export const useUpdatePosCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await apiClient.patch<ApiResponse<PosCustomer>>(
        PosCustomerRoutes.update(id),
        { name },
      );
      return ensurePayload(response.data, 'Failed to update pos customer');
    },
    onSuccess: () => {
      toast.success('POS customer updated');
      queryClient.invalidateQueries({ queryKey: posCustomerKeys.all });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || err.message || 'Update failed',
      );
    },
  });
};

export const useDeletePosCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<null>>(
        PosCustomerRoutes.delete(id),
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('POS customer deleted');
      queryClient.invalidateQueries({ queryKey: posCustomerKeys.all });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || err.message || 'Delete failed',
      );
    },
  });
};

/**
 * Search pos customers by phone number — used in the POS order creation screen.
 * Returns matching customers for the adaptive search dropdown.
 */
export const useSearchPosCustomers = (phone: string) => {
  return useQuery({
    queryKey: [...posCustomerKeys.all, 'search', phone],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<PosCustomer[]>>(
        PosCustomerRoutes.getPaginated,
        { params: { searchTerm: phone, limit: 5 } },
      );
      return ensurePayload(response.data, 'Failed to search customers');
    },
    enabled: phone.length >= 3,
  });
};
