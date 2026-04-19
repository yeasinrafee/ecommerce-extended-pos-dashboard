import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { apiClient } from "@/lib/api";
import type { ApiResponse } from "@/types/auth";
import { StockRoutes } from "@/routes/stock.route";
import { ProductRoutes } from "@/routes/product.route";

export type StockOrderStatus = "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export interface StockProduct {
  id: string;
  stockId: string;
  productId: string;
  quantity: number;
  purchasePrice: number;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    name: string;
    sku?: string | null;
    image?: string | null;
    stock: number;
  };
}

export interface Stock {
  id: string;
  userId: string;
  supplierId: number;
  storeId: string;
  invoiceNumber: string;
  note?: string | null;
  totalProductQuantity: number;
  grandTotal: number;
  orderStatus: StockOrderStatus;
  createdAt: string;
  updatedAt: string;
  supplier?: {
    id: number;
    name: string;
  };
  store?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    email: string;
    admins?: Array<{ name: string }>;
  };
  stockProducts?: StockProduct[];
}

export interface StockPayload {
  supplierId: number;
  storeId: string;
  invoiceNumber?: string;
  note?: string;
  orderStatus: StockOrderStatus;
  createdAt?: string;
  products: Array<{
    productId: string;
    quantity: number;
    purchasePrice: number;
  }>;
}

export interface PagedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BulkPatchStockPayload {
  ids: string[];
  orderStatus: StockOrderStatus;
}

export interface ProductSearchResult {
  id: string;
  name: string;
  sku?: string | null;
  image?: string | null;
  stock: number;
}

const ensurePayload = <T>(response: ApiResponse<T>, fallbackMessage: string) => {
  if (!response.success || response.data == null) {
    throw new Error(response.message || fallbackMessage);
  }
  return response.data;
};

const toNumber = (value: unknown, fallback: number) => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const normalizeMeta = (meta: Record<string, unknown>, page: number, limit: number, fallbackTotal: number) => {
  return {
    page: toNumber(meta.page, page),
    limit: toNumber(meta.limit, limit),
    total: toNumber(meta.total, fallbackTotal),
    totalPages: toNumber(meta.totalPages, 1)
  };
};

export const stockKeys = {
  all: ["stocks"] as const,
  paginated: (page: number, limit: number, searchTerm?: string, orderStatus?: StockOrderStatus) =>
    [...stockKeys.all, "paginated", page, limit, searchTerm, orderStatus] as const,
  detail: (id: string) => [...stockKeys.all, "detail", id] as const,
  invoiceNumber: () => [...stockKeys.all, "invoice-number"] as const,
  productSearch: (searchTerm: string) => [...stockKeys.all, "product-search", searchTerm] as const
};

const fetchStocks = async (page: number, limit: number, searchTerm?: string, orderStatus?: StockOrderStatus): Promise<PagedResult<Stock>> => {
  const response = await apiClient.get<ApiResponse<Stock[]>>(StockRoutes.getAllPaginated, {
    params: { page, limit, searchTerm, orderStatus }
  });

  const stocks = ensurePayload(response.data, "Failed to load stocks");
  const meta = normalizeMeta(response.data.meta as Record<string, unknown>, page, limit, stocks.length);

  return { data: stocks, meta };
};

const fetchStockById = async (id: string): Promise<Stock> => {
  const response = await apiClient.get<ApiResponse<Stock>>(StockRoutes.getById(id));
  return ensurePayload(response.data, "Failed to load stock");
};

const fetchGeneratedInvoiceNumber = async (): Promise<string> => {
  const response = await apiClient.get<ApiResponse<{ invoiceNumber: string }>>(StockRoutes.generateInvoiceNumber);
  const data = ensurePayload(response.data, "Failed to generate invoice number");
  return data.invoiceNumber;
};

const fetchProductSearch = async (searchTerm: string): Promise<ProductSearchResult[]> => {
  const response = await apiClient.get<ApiResponse<ProductSearchResult[]>>(ProductRoutes.getAllPaginated, {
    params: { page: 1, limit: 10, searchTerm }
  });
  return ensurePayload(response.data, "Failed to search products");
};

export const usePaginatedStocks = (page: number, limit = 10, searchTerm?: string, orderStatus?: StockOrderStatus) => {
  return useQuery<PagedResult<Stock>>({
    queryKey: stockKeys.paginated(page, limit, searchTerm, orderStatus),
    queryFn: () => fetchStocks(page, limit, searchTerm, orderStatus),
    placeholderData: keepPreviousData
  });
};

export const useStock = (id: string) => {
  return useQuery<Stock | null>({
    queryKey: stockKeys.detail(id),
    queryFn: () => fetchStockById(id),
    enabled: !!id
  });
};

export const useGenerateStockInvoiceNumber = (enabled = true) => {
  return useQuery<string>({
    queryKey: stockKeys.invoiceNumber(),
    queryFn: fetchGeneratedInvoiceNumber,
    enabled,
    staleTime: 0,
    gcTime: 0
  });
};

export const useStockProductSearch = (searchTerm: string) => {
  const normalized = searchTerm.trim();

  return useQuery<ProductSearchResult[]>({
    queryKey: stockKeys.productSearch(normalized),
    queryFn: () => fetchProductSearch(normalized),
    enabled: normalized.length > 0
  });
};

export const useCreateStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: StockPayload) => {
      const response = await apiClient.post<ApiResponse<Stock>>(StockRoutes.create, payload);
      const data = ensurePayload(response.data, "Failed to create stock");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: Stock }) => {
      toast.success(result.message || "Stock created successfully");
      await queryClient.invalidateQueries({ queryKey: stockKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to create stock";
      toast.error(message);
    }
  });
};

export const usePatchStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<StockPayload> }) => {
      const response = await apiClient.patch<ApiResponse<Stock>>(StockRoutes.update(id), payload);
      const data = ensurePayload(response.data, "Failed to update stock");
      return { message: response.data.message, payload: data, id };
    },
    onSuccess: async (result: { message: string; payload: Stock; id: string }) => {
      toast.success(result.message || "Stock updated successfully");
      await queryClient.invalidateQueries({ queryKey: stockKeys.all });
      queryClient.setQueryData(stockKeys.detail(result.id), result.payload);
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to update stock";
      toast.error(message);
    }
  });
};

const bulkPatchStocksReq = async (payload: BulkPatchStockPayload) => {
  const response = await apiClient.patch<ApiResponse<{ count: number }>>(StockRoutes.bulkPatch, payload);
  return ensurePayload(response.data, "Failed to bulk update stocks");
};

export const useBulkPatchStocks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bulkPatchStocksReq,
    onSuccess: async (data: { count: number }) => {
      toast.success(`${data.count} stock${data.count === 1 ? "" : "s"} updated`);
      await queryClient.invalidateQueries({ queryKey: stockKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to bulk update stocks";
      toast.error(message);
    }
  });
};

export const useDeleteStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<null>>(StockRoutes.delete(id));
      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to delete stock");
      }
      return response.data;
    },
    onSuccess: async (result: any) => {
      toast.success(result?.message || "Stock deleted successfully");
      await queryClient.invalidateQueries({ queryKey: stockKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to delete stock";
      toast.error(message);
    }
  });
};
