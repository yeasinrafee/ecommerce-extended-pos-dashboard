import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { apiClient } from "@/lib/api";
import type { ApiResponse } from "@/types/auth";
import { StockTransferRoutes } from "@/routes/stock-transfer.route";

export type StockTransferStatus = "PENDING" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";

export interface StockTransferProduct {
	id: string;
	stockTransferId: string;
	productId: string;
	quantity: number;
	purchasePrice: number;
	totalPrice: number;
	createdAt: string;
	updatedAt: string;
	deletedAt?: string | null;
	product?: {
		id: string;
		name: string;
		image?: string | null;
		sku?: string | null;
		stock: number;
	};
}

export interface StockTransfer {
	id: string;
	invoiceNumber: string;
	fromStoreId: string;
	toStoreId: string;
	orderStatus: StockTransferStatus;
	quantity: number;
	createdAt: string;
	updatedAt: string;
	deletedAt?: string | null;
	fromStore?: {
		id: string;
		name: string;
	};
	toStore?: {
		id: string;
		name: string;
	};
	stockProductTransfers?: StockTransferProduct[];
}

export interface StockTransferPayload {
	fromStoreId: string;
	toStoreId: string;
	invoiceNumber?: string;
	createdAt?: string;
	products: Array<{
		productId: string;
		quantity: number;
	}>;
}

export interface StockTransferListResult<T> {
	data: T[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface StockTransferBulkPatchPayload {
	ids: string[];
	orderStatus: StockTransferStatus;
}

export interface StockTransferProductSearchResult {
	id: string;
	name: string;
	sku?: string | null;
	stock: number;
	image?: string | null;
	availableQuantity: number;
	purchasePrice: number;
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

export const stockTransferKeys = {
	all: ["stock-transfers"] as const,
	paginated: (page: number, limit: number, searchTerm?: string, orderStatus?: StockTransferStatus) =>
		[...stockTransferKeys.all, "paginated", page, limit, searchTerm, orderStatus] as const,
	detail: (id: string) => [...stockTransferKeys.all, "detail", id] as const,
	invoiceNumber: () => [...stockTransferKeys.all, "invoice-number"] as const,
	productSearch: (fromStoreId: string, searchTerm: string) => [...stockTransferKeys.all, "product-search", fromStoreId, searchTerm] as const
};

const fetchTransfers = async (page: number, limit: number, searchTerm?: string, orderStatus?: StockTransferStatus): Promise<StockTransferListResult<StockTransfer>> => {
	const response = await apiClient.get<ApiResponse<StockTransfer[]>>(StockTransferRoutes.getAllPaginated, {
		params: { page, limit, searchTerm, orderStatus }
	});

	const transfers = ensurePayload(response.data, "Failed to load stock transfers");
	const meta = normalizeMeta(response.data.meta as Record<string, unknown>, page, limit, transfers.length);

	return { data: transfers, meta };
};

const fetchTransferById = async (id: string): Promise<StockTransfer> => {
	const response = await apiClient.get<ApiResponse<StockTransfer>>(StockTransferRoutes.getById(id));
	return ensurePayload(response.data, "Failed to load stock transfer");
};

const fetchGeneratedInvoiceNumber = async (): Promise<string> => {
	const response = await apiClient.get<ApiResponse<{ invoiceNumber: string }>>(StockTransferRoutes.generateInvoiceNumber);
	const data = ensurePayload(response.data, "Failed to generate stock transfer invoice number");
	return data.invoiceNumber;
};

const fetchProductSearch = async (fromStoreId: string, searchTerm: string): Promise<StockTransferProductSearchResult[]> => {
	const response = await apiClient.get<ApiResponse<StockTransferProductSearchResult[]>>(StockTransferRoutes.searchProducts, {
		params: { fromStoreId, searchTerm }
	});
	return ensurePayload(response.data, "Failed to search transfer products");
};

export const usePaginatedStockTransfers = (page: number, limit = 10, searchTerm?: string, orderStatus?: StockTransferStatus) => {
	return useQuery<StockTransferListResult<StockTransfer>>({
		queryKey: stockTransferKeys.paginated(page, limit, searchTerm, orderStatus),
		queryFn: () => fetchTransfers(page, limit, searchTerm, orderStatus),
		placeholderData: keepPreviousData
	});
};

export const useStockTransfer = (id: string) => {
	return useQuery<StockTransfer | null>({
		queryKey: stockTransferKeys.detail(id),
		queryFn: () => fetchTransferById(id),
		enabled: !!id
	});
};

export const useGenerateStockTransferInvoiceNumber = (enabled = true) => {
	return useQuery<string>({
		queryKey: stockTransferKeys.invoiceNumber(),
		queryFn: fetchGeneratedInvoiceNumber,
		enabled,
		staleTime: 0,
		gcTime: 0
	});
};

export const useStockTransferProductSearch = (fromStoreId: string, searchTerm: string) => {
	const normalized = searchTerm.trim();
	const storeId = fromStoreId.trim();

	return useQuery<StockTransferProductSearchResult[]>({
		queryKey: stockTransferKeys.productSearch(storeId, normalized),
		queryFn: () => fetchProductSearch(storeId, normalized),
		enabled: storeId.length > 0 && normalized.length > 0
	});
};

export const useCreateStockTransfer = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: StockTransferPayload) => {
			const response = await apiClient.post<ApiResponse<StockTransfer>>(StockTransferRoutes.create, payload);
			const data = ensurePayload(response.data, "Failed to create stock transfer");
			return { message: response.data.message, payload: data };
		},
		onSuccess: async (result: { message: string; payload: StockTransfer }) => {
			toast.success(result.message || "Stock transfer created successfully");
			await queryClient.invalidateQueries({ queryKey: stockTransferKeys.all });
		},
		onError: (err: any) => {
			const message = err?.response?.data?.message || err?.message || "Failed to create stock transfer";
			toast.error(message);
		}
	});
};

export const usePatchStockTransfer = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, payload }: { id: string; payload: Partial<{ orderStatus: StockTransferStatus }> }) => {
			const response = await apiClient.patch<ApiResponse<StockTransfer>>(StockTransferRoutes.patch(id), payload);
			const data = ensurePayload(response.data, "Failed to update stock transfer");
			return { message: response.data.message, payload: data, id };
		},
		onSuccess: async (result: { message: string; payload: StockTransfer; id: string }) => {
			toast.success(result.message || "Stock transfer updated successfully");
			await queryClient.invalidateQueries({ queryKey: stockTransferKeys.all });
			queryClient.setQueryData(stockTransferKeys.detail(result.id), result.payload);
		},
		onError: (err: any) => {
			const message = err?.response?.data?.message || err?.message || "Failed to update stock transfer";
			toast.error(message);
		}
	});
};

const bulkPatchStockTransfersReq = async (payload: StockTransferBulkPatchPayload) => {
	const response = await apiClient.patch<ApiResponse<{ count: number }>>(StockTransferRoutes.bulkPatch, payload);
	return ensurePayload(response.data, "Failed to bulk update stock transfers");
};

export const useBulkPatchStockTransfers = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: bulkPatchStockTransfersReq,
		onSuccess: async (data: { count: number }) => {
			toast.success(`${data.count} transfer${data.count === 1 ? "" : "s"} updated`);
			await queryClient.invalidateQueries({ queryKey: stockTransferKeys.all });
		},
		onError: (err: any) => {
			const message = err?.response?.data?.message || err?.message || "Failed to bulk update stock transfers";
			toast.error(message);
		}
	});
};

export const useDeleteStockTransfer = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const response = await apiClient.delete<ApiResponse<null>>(StockTransferRoutes.delete(id));
			if (!response.data.success) {
				throw new Error(response.data.message || "Failed to delete stock transfer");
			}
			return response.data;
		},
		onSuccess: async (result: any) => {
			toast.success(result?.message || "Stock transfer deleted successfully");
			await queryClient.invalidateQueries({ queryKey: stockTransferKeys.all });
		},
		onError: (err: any) => {
			const message = err?.response?.data?.message || err?.message || "Failed to delete stock transfer";
			toast.error(message);
		}
	});
};