import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { PosRoutes } from "@/routes/pos.route";
import type { ApiResponse } from "@/types/auth";
import { toast } from "react-hot-toast";

/* ──────────────────────────── types ──────────────────────────── */

export interface PosProductVariation {
  id: string;
  attributeValue: string;
  basePrice: number;
  finalPrice: number;
}

export interface PosProduct {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  posPrice: number;
  Baseprice: number;
  finalPrice: number;
  discountType: string | null;
  discountValue: number | null;
  stock: number;
  sku: string;
  image: string | null;
  galleryImages: string[];
  status: string;
  stockStatus: string;
  brand: string | null;
  categories: string[];
  tags: string[];
  productVariations: PosProductVariation[];
}

export interface PosPayment {
  id?: string;
  amount: number;
  paymentMethod: "CASH" | "BANKCARD" | "BKASH" | "NAGAD" | "ROCKET";
  bankId?: string | null;
  bank?: {
    id: string;
    bankName: string;
    accountNumber: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PosBillSummary {
  id: string;
  invoiceNumber: string;
  totalQuantity: number;
  totalAmount: number;
  paymentStatus?: "PAID" | "PENDING" | "DUE";
  payments?: PosPayment[];
  globalPayments?: PosPayment[];
  createdAt: string;
  processedBy: {
    userId: string;
    adminName: string | null;
  } | null;
}

export interface PosBillItemVariation {
  id: string;
  attributeId: string;
  attributeName: string;
  attributeValue: string;
}

export interface PosBillItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  productSku: string;
  quantity: number;
  unitBasePrice: number;
  unitFinalPrice: number;
  lineBaseTotal: number;
  lineFinalTotal: number;
  discountType: string | null;
  discountValue: number | null;
  variations: PosBillItemVariation[];
}

export interface PosBillDetail {
  id: string;
  invoiceNumber: string;
  storeId: string | null;
  store: {
    id: string;
    name: string;
    address: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  } | null;
  cashier: {
    id: string;
    email: string;
    name: string | null;
  };
  baseAmount: number;
  finalAmount: number;
  createdAt: string;
  updatedAt: string;
  paymentStatus?: "PAID" | "PENDING" | "DUE";
  orderDiscountType?: "PERCENTAGE_DISCOUNT" | "FLAT_DISCOUNT" | "NONE" | null;
  orderDiscountValue?: number | null;
  totalPaid?: number;
  dueAmount?: number;
  payments?: PosPayment[];
  items: PosBillItem[];
  summary: {
    totalItems: number;
    totalQuantity: number;
  };
}

export interface CreateBillProductLine {
  productId: string;
  quantity?: number;
  variationIds?: string[];
  variationQuantities?: number[];
}

export interface CreatePosBillPayload {
  storeId?: string;
  discountType?: "PERCENTAGE_DISCOUNT" | "FLAT_DISCOUNT" | "NONE";
  discountValue?: number;
  products: CreateBillProductLine[];
  payments?: PosPayment[];
}

export interface PosBillListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/* ──────────────────────────── helpers ──────────────────────────── */

const toNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const normalizeMeta = (
  meta: Record<string, unknown>,
  page: number,
  limit: number,
  fallbackTotal: number,
): PosBillListMeta => ({
  page: toNumber(meta.page, page),
  limit: toNumber(meta.limit, limit),
  total: toNumber(meta.total, fallbackTotal),
  totalPages: toNumber(meta.totalPages, 1),
});

const ensurePayload = <T>(
  response: ApiResponse<T>,
  fallbackMessage: string,
) => {
  if (!response.success || response.data == null) {
    throw new Error(response.message || fallbackMessage);
  }
  return response.data;
};

/* ──────────────────────────── query keys ──────────────────────────── */

export const posKeys = {
  all: ["pos"] as const,
  products: (searchTerm?: string, storeId?: string) =>
    [...posKeys.all, "products", searchTerm, storeId] as const,
  bills: (page: number, limit: number) =>
    [...posKeys.all, "bills", page, limit] as const,
  bill: (orderId: string) => [...posKeys.all, "bill", orderId] as const,
};

/* ──────────────────────────── hooks ──────────────────────────── */

export const usePosProducts = (searchTerm?: string, storeId?: string) => {
  return useQuery<PosProduct[]>({
    queryKey: posKeys.products(searchTerm, storeId),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (searchTerm) params.searchTerm = searchTerm;
      if (storeId) params.storeId = storeId;
      const response = await apiClient.get<ApiResponse<PosProduct[]>>(
        PosRoutes.getProducts,
        { params },
      );
      return ensurePayload(response.data, "Failed to load products");
    },
    placeholderData: keepPreviousData,
  });
};

export const usePosBills = (page: number, limit = 10) => {
  return useQuery<{ data: PosBillSummary[]; meta: PosBillListMeta }>({
    queryKey: posKeys.bills(page, limit),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<PosBillSummary[]>>(
        PosRoutes.getBills,
        { params: { page, limit } },
      );
      const bills = ensurePayload(response.data, "Failed to load bills");
      const meta = normalizeMeta(response.data.meta, page, limit, bills.length);
      return { data: bills, meta };
    },
    placeholderData: keepPreviousData,
  });
};

export const fetchPosBill = async (orderId: string) => {
  const response = await apiClient.get<ApiResponse<PosBillDetail>>(
    PosRoutes.getBill(orderId),
  );
  return ensurePayload(response.data, "Failed to load bill");
};

export const usePosBill = (orderId: string) => {
  return useQuery<PosBillDetail>({
    queryKey: posKeys.bill(orderId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<PosBillDetail>>(
        PosRoutes.getBill(orderId),
      );
      return ensurePayload(response.data, "Failed to load bill");
    },
    enabled: !!orderId,
  });
};

export const useCreatePosBill = () => {
  const queryClient = useQueryClient();
  return useMutation<PosBillDetail, Error, CreatePosBillPayload>({
    mutationFn: async (payload) => {
      const response = await apiClient.post<ApiResponse<PosBillDetail>>(
        PosRoutes.createBill,
        payload,
      );
      return ensurePayload(response.data, "Failed to create bill");
    },
    onSuccess: (_data, _vars) => {
      toast.success("POS bill created successfully");
      queryClient.invalidateQueries({ queryKey: posKeys.all });
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.message || err?.message || "Failed to create bill";
      toast.error(message);
    },
  });
};

export const useUpdatePosBill = () => {
  const queryClient = useQueryClient();
  return useMutation<
    PosBillDetail,
    Error,
    { orderId: string; payload: CreatePosBillPayload }
  >({
    mutationFn: async ({ orderId, payload }) => {
      const response = await apiClient.patch<ApiResponse<PosBillDetail>>(
        PosRoutes.updateBill(orderId),
        payload,
      );
      return ensurePayload(response.data, "Failed to update bill");
    },
    onSuccess: () => {
      toast.success("POS bill updated successfully");
      queryClient.invalidateQueries({ queryKey: posKeys.all });
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.message || err?.message || "Failed to update bill";
      toast.error(message);
    },
  });
};

export const useDeletePosBill = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { id: string; invoiceNumber: string; deletedAt: string },
    Error,
    string
  >({
    mutationFn: async (orderId) => {
      const response = await apiClient.delete<
        ApiResponse<{ id: string; invoiceNumber: string; deletedAt: string }>
      >(PosRoutes.deleteBill(orderId));
      return ensurePayload(response.data, "Failed to delete bill");
    },
    onSuccess: () => {
      toast.success("POS bill deleted successfully");
      queryClient.invalidateQueries({ queryKey: posKeys.all });
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.message || err?.message || "Failed to delete bill";
      toast.error(message);
    },
  });
};

export const useAddPosPayment = () => {
  const queryClient = useQueryClient();
  return useMutation<
    any,
    Error,
    { orderId: string; payments: PosPayment[] }
  >({
    mutationFn: async ({ orderId, payments }) => {
      const response = await apiClient.post<ApiResponse<any>>(
        PosRoutes.addPayment(orderId),
        { payments },
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Payments added to processing queue");
      queryClient.invalidateQueries({ queryKey: posKeys.all });
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.message || err?.message || "Failed to add payment";
      toast.error(message);
    },
  });
};

export const useDeletePosPayment = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { orderId: string; paymentId: string }>({
    mutationFn: async ({ orderId, paymentId }) => {
      const response = await apiClient.delete<ApiResponse<any>>(
        PosRoutes.deletePayment(orderId, paymentId),
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Payment deleted successfully");
      queryClient.invalidateQueries({ queryKey: posKeys.all });
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.message || err?.message || "Failed to delete payment";
      toast.error(message);
    },
  });
};
