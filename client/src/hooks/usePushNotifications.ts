import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

interface NotificationPayload {
  title: string;
  message: string;
  type?: string;
  apartmentId?: string;
  url?: string;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported');
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      throw error;
    }
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported || permission !== 'granted') {
      throw new Error('Permission not granted for notifications');
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // VAPID public key - this should be generated and stored securely
      const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HI80xmqjNzkONXUmf4ESfGaWiKNXJ0dO4lJ8JRH0XOo_8hH9M6NvL2z6Y8';
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      setSubscription(subscription);

      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          userId: user?.id
        })
      });

      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
    }
  }, [isSupported, permission, user?.id]);

  const unsubscribe = useCallback(async () => {
    if (!subscription) {
      return;
    }

    try {
      await subscription.unsubscribe();
      setSubscription(null);

      // Remove subscription from server
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          userId: user?.id
        })
      });
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  }, [subscription, user?.id]);

  const showNotification = useCallback(async (title: string, options: NotificationPayload) => {
    if (!isSupported || permission !== 'granted') {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body: options.message,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'househunt-local',
        data: options,
        requireInteraction: false,
        actions: [
          {
            action: 'view',
            title: 'View Details',
            icon: '/icon-192.png'
          }
        ]
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }, [isSupported, permission]);

  // Check if we can show notifications
  const canShow = permission === 'granted' && isSupported;

  return {
    isSupported,
    permission,
    subscription,
    canShow,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}