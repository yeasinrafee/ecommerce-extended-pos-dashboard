import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/lib/api';
import type { ApiResponse } from '@/types/auth';
import { OfferRoutes } from '@/routes/offer.route';
import type { Product } from '@/hooks/product.api';

export interface OfferProductRelation {
	id: string;
	productId: string;
	offerId: string;
	product: Product;
}

export interface Offer {
	id: string;
	discountType: 'PERCENTAGE_DISCOUNT' | 'FLAT_DISCOUNT' | 'NONE' | null;
	discountValue: number | null;
	discountStartDate: string | null;
	discountEndDate: string | null;
	status: 'ACTIVE' | 'INACTIVE';
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	offerProducts?: OfferProductRelation[];
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

export interface OfferFormPayload {
	discountType: 'PERCENTAGE_DISCOUNT' | 'FLAT_DISCOUNT' | 'NONE';
	discountValue: number | null;
	discountStartDate: string | null;
	discountEndDate: string | null;
	status: 'ACTIVE' | 'INACTIVE';
	productIds: string[];
}

export interface BulkUpdateOfferStatusPayload {
	ids: string[];
	status: 'ACTIVE' | 'INACTIVE';
}

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

export const offerKeys = {
	all: ['offers'] as const,
	paginated: (page: number, limit: number) => [...offerKeys.all, 'paginated', page, limit] as const,
	detail: (id: string) => [...offerKeys.all, 'detail', id] as const
};

const fetchPaginatedOffers = async (page: number, limit: number): Promise<PagedResult<Offer>> => {
	const response = await apiClient.get<ApiResponse<Offer[]>>(OfferRoutes.getAllPaginated, { params: { page, limit } });
	const offers = ensurePayload(response.data, 'Failed to load offers');
	const meta = normalizeMeta(response.data.meta as Record<string, unknown>, page, limit, offers.length);

	return { data: offers, meta };
};

const fetchAllOffers = async (): Promise<Offer[]> => {
	const response = await apiClient.get<ApiResponse<Offer[]>>(OfferRoutes.getAll);
	return ensurePayload(response.data, 'Failed to load offers');
};

const fetchOffer = async (id: string): Promise<Offer> => {
	const response = await apiClient.get<ApiResponse<Offer>>(OfferRoutes.getById(id));
	return ensurePayload(response.data, 'Failed to load offer');
};

const createOffer = async (payload: OfferFormPayload) => {
	const response = await apiClient.post<ApiResponse<Offer>>(OfferRoutes.create, payload);
	const offer = ensurePayload(response.data, 'Failed to create offer');
	return { message: response.data.message, payload: offer };
};

const updateOffer = async ({ id, payload }: { id: string; payload: OfferFormPayload }) => {
	const response = await apiClient.patch<ApiResponse<Offer>>(OfferRoutes.update(id), payload);
	const offer = ensurePayload(response.data, 'Failed to update offer');
	return { message: response.data.message, payload: offer };
};

const deleteOfferReq = async (id: string) => {
	const response = await apiClient.delete<ApiResponse<null>>(OfferRoutes.delete(id));
	if (!response.data.success) {
		throw new Error(response.data.message || 'Failed to delete offer');
	}
	return response.data;
};

const bulkUpdateOfferStatusReq = async (payload: BulkUpdateOfferStatusPayload) => {
	const response = await apiClient.patch<ApiResponse<{ updated: number }>>(OfferRoutes.bulkUpdateStatus, payload);
	const data = ensurePayload(response.data, 'Failed to update offer statuses');
	return { message: response.data.message, payload: data };
};

export const usePaginatedOffers = (page: number, limit = 10) => {
	return useQuery<PagedResult<Offer>>({
		queryKey: offerKeys.paginated(page, limit),
		queryFn: () => fetchPaginatedOffers(page, limit),
		placeholderData: keepPreviousData
	});
};

export const useAllOffers = () => {
	return useQuery<Offer[]>({
		queryKey: offerKeys.all,
		queryFn: fetchAllOffers
	});
};

export const useGetOffer = (id: string) => {
	return useQuery<Offer | null>({
		queryKey: offerKeys.detail(id),
		queryFn: () => fetchOffer(id),
		enabled: !!id
	});
};

export const useCreateOffer = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createOffer,
		onSuccess: async (result) => {
			toast.success(result.message || 'Offer created successfully');
			await queryClient.invalidateQueries({ queryKey: offerKeys.all });
		},
		onError: (err: any) => {
			const message = err?.response?.data?.message || err?.message || 'Failed to create offer';
			toast.error(message);
		}
	});
};

export const useUpdateOffer = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateOffer,
		onSuccess: async (result, variables) => {
			toast.success(result.message || 'Offer updated successfully');
			await queryClient.invalidateQueries({ queryKey: offerKeys.all });
			queryClient.setQueryData(offerKeys.detail(variables.id), result.payload);
		},
		onError: (err: any) => {
			const message = err?.response?.data?.message || err?.message || 'Failed to update offer';
			toast.error(message);
		}
	});
};

export const useDeleteOffer = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteOfferReq,
		onSuccess: async (data: any) => {
			toast.success(data?.message || 'Offer deleted successfully');
			await queryClient.invalidateQueries({ queryKey: offerKeys.all });
		},
		onError: (err: any) => {
			const message = err?.response?.data?.message || err?.message || 'Failed to delete offer';
			toast.error(message);
		}
	});
};

export const useBulkUpdateOfferStatus = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: bulkUpdateOfferStatusReq,
		onMutate: async (variables) => {
			await queryClient.cancelQueries({ queryKey: offerKeys.all });
			const snapshots = queryClient.getQueriesData({ queryKey: offerKeys.all });
			const offerIds = new Set(variables.ids);

			snapshots.forEach(([queryKey, data]) => {
				if (!data || typeof data !== 'object' || !('data' in data) || !Array.isArray((data as PagedResult<Offer>).data)) {
					return;
				}

				const pageData = data as PagedResult<Offer>;
				queryClient.setQueryData(queryKey, {
					...pageData,
					data: pageData.data.map((offer) => offerIds.has(offer.id) ? { ...offer, status: variables.status } : offer)
				});
			});

			return { snapshots };
		},
		onSuccess: async (result) => {
			toast.success(result.message || 'Offer statuses updated successfully');
			await queryClient.invalidateQueries({ queryKey: offerKeys.all });
		},
		onError: (err: any, _variables, context) => {
			context?.snapshots?.forEach(([queryKey, data]) => {
				queryClient.setQueryData(queryKey, data);
			});
			const message = err?.response?.data?.message || err?.message || 'Failed to update offer statuses';
			toast.error(message);
		}
	});
};
