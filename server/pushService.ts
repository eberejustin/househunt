import webpush from 'web-push';
import { storage } from './storage';

// VAPID keys for push notifications - in production, these should be environment variables
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HI80xmqjNzkONXUmf4ESfGaWiKNXJ0dO4lJ8JRH0XOo_8hH9M6NvL2z6Y8';
const VAPID_PRIVATE_KEY = 'aUGBdo_2DPOZ2KDNbQV1B6vZI1LFx4F9-FRc4lHm_ZI';

// Configure web-push
webpush.setVapidDetails(
  'mailto:contact@househunt.app',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPayload {
  title: string;
  message: string;
  type?: string;
  apartmentId?: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<boolean> {
  try {
    const pushPayload = JSON.stringify({
      title: payload.title,
      message: payload.message,
      body: payload.message, // alias for compatibility
      type: payload.type || 'default',
      apartmentId: payload.apartmentId,
      url: payload.url,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-192.png',
      tag: payload.tag || 'househunt-notification',
      requireInteraction: payload.requireInteraction || false,
      actions: payload.actions || [
        {
          action: 'view',
          title: 'View Details',
          icon: '/icon-192.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    });

    await webpush.sendNotification(subscription, pushPayload);
    console.log('Push notification sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<number> {
  try {
    const subscriptions = await storage.getUserPushSubscriptions(userId);
    let successCount = 0;

    for (const subscription of subscriptions) {
      try {
        const success = await sendPushNotification(subscription, payload);
        if (success) {
          successCount++;
        }
      } catch (error) {
        console.error(`Failed to send push to subscription ${subscription.endpoint}:`, error);
        // Remove invalid subscriptions
        await storage.removePushSubscription(subscription.endpoint);
      }
    }

    console.log(`Sent push notification to ${successCount}/${subscriptions.length} subscriptions for user ${userId}`);
    return successCount;
  } catch (error) {
    console.error('Error sending push to user:', error);
    return 0;
  }
}

export async function sendPushToAllUsers(
  excludeUserId: string,
  payload: PushPayload
): Promise<number> {
  try {
    const allUsers = await storage.getAllUsers();
    const targetUsers = allUsers.filter(user => user.id !== excludeUserId);
    
    let totalSent = 0;
    
    for (const user of targetUsers) {
      const sent = await sendPushToUser(user.id, payload);
      totalSent += sent;
    }

    console.log(`Sent push notifications to ${totalSent} total subscriptions`);
    return totalSent;
  } catch (error) {
    console.error('Error sending push to all users:', error);
    return 0;
  }
}