import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { BankRoutes } from "@/routes/bank.route";
import type { ApiResponse } from "@/types/auth";
import { toast } from "react-hot-toast";

export interface Bank {
  id: string;
  bankName: string;
  branch: string;
  accountNumber: string;
  createdAt: string;
  updatedAt: string;
}

export type BankPayload = {
  bankName: string;
  branch: string;
  accountNumber: string;
};

const ensurePayload = <T>(response: ApiResponse<T>, fallbackMessage: string) => {
  if (!response.success || response.data == null) {
    throw new Error(response.message || fallbackMessage);
  }
  return response.data;
};

export const bankKeys = {
  all: ["banks"] as const,
  list: (searchTerm?: string) => [...bankKeys.all, "list", searchTerm] as const,
};

export const useAllBanks = (searchTerm?: string) => {
  return useQuery<Bank[]>({
    queryKey: bankKeys.list(searchTerm),
    queryFn: async () => {
      const params = searchTerm ? { searchTerm } : {};
      const response = await apiClient.get<ApiResponse<Bank[]>>(BankRoutes.getAll, { params });
      return ensurePayload(response.data, "Failed to load banks");
    },
    placeholderData: keepPreviousData,
  });
};

export const useCreateBank = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BankPayload) => {
      const response = await apiClient.post<ApiResponse<Bank>>(BankRoutes.create, payload);
      const data = ensurePayload(response.data, "Failed to create bank");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: Bank }) => {
      toast.success(result.message || "Bank created");
      await queryClient.invalidateQueries({ queryKey: bankKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to create bank";
      toast.error(message);
    },
  });
};

export const useUpdateBank = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<BankPayload> }) => {
      const response = await apiClient.patch<ApiResponse<Bank>>(BankRoutes.update(id), payload);
      const data = ensurePayload(response.data, "Failed to update bank");
      return { message: response.data.message, payload: data };
    },
    onSuccess: async (result: { message: string; payload: Bank }) => {
      toast.success(result.message || "Bank updated");
      await queryClient.invalidateQueries({ queryKey: bankKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to update bank";
      toast.error(message);
    },
  });
};

export const useDeleteBank = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<null>>(BankRoutes.delete(id));
      return { message: response.data.message, id };
    },
    onSuccess: async (result: { message?: string; id: string }) => {
      toast.success(result.message || "Bank deleted");
      await queryClient.invalidateQueries({ queryKey: bankKeys.all });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || "Failed to delete bank";
      toast.error(message);
    },
  });
};
