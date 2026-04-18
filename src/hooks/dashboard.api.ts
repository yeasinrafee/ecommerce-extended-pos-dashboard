import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { ApiResponse } from "@/types/auth";

type DashboardQuery = {
  startDate?: string;
  endDate?: string;
  month?: string;
  year?: string;
};

export const dashboardApis = {
  useGetAnalytics: (query: DashboardQuery) => {
    return useQuery<ApiResponse<any>>({
      queryKey: ["dashboard-analytics", query],
      queryFn: async () => {
        const response = await apiClient.get<ApiResponse<any>>("/dashboard/analytics", { params: query });
        return response.data;
      },
    });
  },
};
