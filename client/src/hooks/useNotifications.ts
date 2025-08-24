import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { NotificationWithDetails } from "@shared/schema";

export function useNotifications() {
  return useQuery<NotificationWithDetails[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      console.log("Marking notification as read:", notificationId);
      const response = await apiRequest(`/api/notifications/${notificationId}/read`, "PATCH");
      console.log("Mark as read response:", response);
      return response;
    },
    onSuccess: (data, notificationId) => {
      console.log("Mark as read success, invalidating queries...");
      // Optimistically update the cache
      queryClient.setQueryData(["/api/notifications"], (old: any) => {
        if (!old) return old;
        return old.map((n: any) => 
          n.id === notificationId ? { ...n, isRead: true } : n
        );
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error) => {
      console.error("Error marking notification as read:", error);
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      console.log("Marking all notifications as read...");
      const response = await apiRequest("/api/notifications/read-all", "PATCH");
      console.log("Mark all as read response:", response);
      return response;
    },
    onSuccess: () => {
      console.log("Mark all as read success, invalidating queries...");
      // Optimistically update the cache
      queryClient.setQueryData(["/api/notifications"], (old: any) => {
        if (!old) return old;
        return old.map((n: any) => ({ ...n, isRead: true }));
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error) => {
      console.error("Error marking all notifications as read:", error);
    },
  });
}