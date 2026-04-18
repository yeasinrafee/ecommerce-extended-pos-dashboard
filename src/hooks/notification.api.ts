import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { NotificationRoutes } from "@/routes/notification.route";

export interface Notification {
  id: string;
  title: string;
  message: string | null;
  createdAt: string;
  seen: boolean;
}

export interface NotificationResponse {
  success: boolean;
  data: Notification[];
  unseenCount: number;
}

export const notificationKeys = {
  all: ["notifications"] as const,
};

export const useNotifications = () => {
  return useQuery({
    queryKey: notificationKeys.all,
    queryFn: async () => {
      const response = await apiClient.get<NotificationResponse>(NotificationRoutes.getAll);
      return response.data;
    },
    refetchInterval: 5 * 60 * 1000, 
  });
};

export const useMarkNotificationsSeen = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const response = await apiClient.post(NotificationRoutes.markSeen, {
        notificationIds,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};
