import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { apiClient } from "@/lib/api";
import { ProductRoutes } from "@/routes/product.route";
import type { ApiResponse } from "@/types/auth";

export interface Product {
	id: string;
	name: string;
	slug: string;
	image?: string | null;
	sku?: string | null;
	brand?: any;
	categories?: any[];
	tags?: any[];
	stock?: number;
	status?: string;
	stockStatus?: string;
	basePrice?: number;
	posPrice?: number | null;
	finalPrice?: number;
	discountType?: string | null;
	discountValue?: number | null;
	discountStartDate?: string | null;
	discountEndDate?: string | null;
	offer?: {
		id: string | null;
		discountType: "NONE" | "PERCENTAGE_DISCOUNT" | "FLAT_DISCOUNT";
		discountValue: number | null;
		discountStartDate: string | null;
		discountEndDate: string | null;
		status: "ACTIVE" | "INACTIVE";
		finalPrice?: number | null;
	} | null;
	createdAt: string;
	updatedAt: string;
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

export const productKeys = {
	all: ["products"] as const,
	paginated: (page: number, limit: number, searchTerm?: string | null) => [...productKeys.all, "paginated", page, limit, searchTerm ?? null] as const,
	list: () => [...productKeys.all, "list"] as const,
	detail: (id: string) => [...productKeys.all, "detail", id] as const
};

const ensurePayload = <T>(response: ApiResponse<T>, fallbackMessage: string) => {
	if (!response.success || response.data == null) {
		throw new Error(response.message || fallbackMessage);
	}

	return response.data;
};

const toNumber = (value: unknown, fallback: number) => {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const normalizeMeta = (meta: Record<string, unknown>, page: number, limit: number, fallbackTotal: number) => {
	return {
		page: toNumber(meta.page, page),
		limit: toNumber(meta.limit, limit),
		total: toNumber(meta.total, fallbackTotal),
		totalPages: toNumber(meta.totalPages, 1)
	};
};

export const useCreateProduct = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: FormData) => {
			const response = await apiClient.post<ApiResponse<Product>>(ProductRoutes.create, payload);
			const data = ensurePayload(response.data, "Failed to create product");
			return { message: response.data.message, payload: data };
		},
		onSuccess: async (result: { message: string; payload: Product }) => {
			toast.success(result.message || "Product created successfully");
			await queryClient.invalidateQueries({ queryKey: productKeys.all });
		},
		onError: (err: any) => {
			const message = err?.response?.data?.message || err?.message || "Failed to create product";
			toast.error(message);
		}
	});
};

const fetchPaginatedProducts = async (page: number, limit: number, searchTerm?: string | null) => {
	const params: Record<string, unknown> = { page, limit };
	if (searchTerm) params.searchTerm = searchTerm;
	const response = await apiClient.get<ApiResponse<Product[]>>(ProductRoutes.getAllPaginated, { params });
	const products = ensurePayload(response.data, 'Failed to load products');
	const meta = normalizeMeta(response.data.meta as Record<string, unknown>, page, limit, products.length);
	return { data: products, meta } as PagedResult<Product>;
};

const fetchAllProducts = async (): Promise<Product[]> => {
	const response = await apiClient.get<ApiResponse<Product[]>>(ProductRoutes.getAll);
	return ensurePayload(response.data, 'Failed to load products');
};

const fetchProductById = async (id: string): Promise<Product> => {
	const response = await apiClient.get<ApiResponse<Product>>(ProductRoutes.getById(id));
	return ensurePayload(response.data, 'Failed to load product');
};

const deleteProductReq = async (id: string) => {
	const response = await apiClient.delete<ApiResponse<null>>(ProductRoutes.delete(id));
	if (!response.data.success) {
		throw new Error(response.data.message || 'Failed to delete product');
	}
	return response.data;
};

export const usePaginatedProducts = (page: number, limit = 20, searchTerm?: string | null) => {
	return useQuery<PagedResult<Product>>({
		queryKey: productKeys.paginated(page, limit, searchTerm ?? null),
		queryFn: () => fetchPaginatedProducts(page, limit, searchTerm ?? null),
		enabled: Boolean(searchTerm?.trim()),
		placeholderData: keepPreviousData
	});
};

export const useAllProducts = () => {
	return useQuery<Product[]>({
		queryKey: productKeys.list(),
		queryFn: fetchAllProducts
	});
};

export const useGetProduct = (id: string) => {
	return useQuery<Product | null>({
		queryKey: productKeys.detail(id),
		queryFn: () => fetchProductById(id),
		enabled: !!id
	});
};

const updateProductReq = async ({ id, payload }: { id: string; payload: FormData }) => {
	const response = await apiClient.patch<ApiResponse<Product>>(ProductRoutes.update(id), payload);
	return ensurePayload(response.data, 'Failed to update product');
};

export const useUpdateProduct = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: updateProductReq,
		onSuccess: async (data, variables) => {
			toast.success('Product updated successfully');
			await queryClient.invalidateQueries({ queryKey: productKeys.all });
			queryClient.setQueryData(productKeys.detail(variables.id), data);
		},
		onError: (err: any) => {
			const message = err?.response?.data?.message || err?.message || 'Failed to update product';
			toast.error(message);
		}
	});
};

export const useDeleteProduct = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteProductReq,
		onSuccess: async (data: any) => {
			toast.success(data?.message || 'Product deleted successfully');
			await queryClient.invalidateQueries({ queryKey: productKeys.all });
		},
		onError: (err: any) => {
			const message = err?.response?.data?.message || err?.message || 'Failed to delete product';
			toast.error(message);
		}
	});
};

const patchProductReq = async ({ id, payload }: { id: string; payload: Record<string, string> }) => {
	const response = await apiClient.patch<ApiResponse<Product>>(ProductRoutes.patch(id), payload);
	return ensurePayload(response.data, 'Failed to update product');
};

export const usePatchProduct = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: patchProductReq,
		onSuccess: async (data, variables) => {
			toast.success('Product updated');
			await queryClient.invalidateQueries({ queryKey: productKeys.all });
			queryClient.setQueryData(productKeys.detail(variables.id), data);
		},
		onError: (err: any) => {
			const message = err?.response?.data?.message || err?.message || 'Failed to update product';
			toast.error(message);
		}
	});
};

const bulkPatchProductsReq = async (payload: { ids: string[]; status?: string; stockStatus?: string }) => {
	const response = await apiClient.patch<ApiResponse<{ count: number }>>(ProductRoutes.bulkPatch, payload);
	return ensurePayload(response.data, 'Failed to bulk update products');
};

export const useBulkPatchProducts = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: bulkPatchProductsReq,
		onSuccess: async (data) => {
			toast.success(`${(data as any).count ?? 'Products'} product(s) updated`);
			await queryClient.invalidateQueries({ queryKey: productKeys.all });
		},
		onError: (err: any) => {
			const message = err?.response?.data?.message || err?.message || 'Failed to bulk update products';
			toast.error(message);
		}
	});
};

