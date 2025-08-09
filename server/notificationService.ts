import { WebSocket } from "ws";
import { storage } from "./storage";
import type { InsertNotification } from "@shared/schema";

// Store active WebSocket connections by user ID
const userConnections = new Map<string, Set<WebSocket>>();

export function addUserConnection(userId: string, ws: WebSocket) {
  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }
  userConnections.get(userId)!.add(ws);
  
  // Remove connection when it closes
  ws.on('close', () => {
    const connections = userConnections.get(userId);
    if (connections) {
      connections.delete(ws);
      if (connections.size === 0) {
        userConnections.delete(userId);
      }
    }
  });

  console.log(`User ${userId} connected via WebSocket. Total connections: ${userConnections.get(userId)?.size || 0}`);
}

export function removeUserConnection(userId: string, ws: WebSocket) {
  const connections = userConnections.get(userId);
  if (connections) {
    connections.delete(ws);
    if (connections.size === 0) {
      userConnections.delete(userId);
    }
  }
}

export async function sendNotificationToUser(userId: string, notification: any) {
  const connections = userConnections.get(userId);
  if (!connections || connections.size === 0) {
    console.log(`No active connections for user ${userId}`);
    return;
  }

  const message = JSON.stringify({
    type: 'notification',
    data: notification
  });

  // Send to all active connections for this user
  connections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });

  console.log(`Sent notification to ${connections.size} connections for user ${userId}`);
}

export async function sendNotificationToAllUsers(excludeUserId: string, notification: any) {
  let sentCount = 0;
  
  for (const [userId, connections] of Array.from(userConnections.entries())) {
    if (userId === excludeUserId) continue; // Don't notify the user who performed the action
    
    const message = JSON.stringify({
      type: 'notification',
      data: notification
    });

    connections.forEach((ws: WebSocket) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        sentCount++;
      }
    });
  }

  console.log(`Sent notification to ${sentCount} total connections`);
}

export async function createAndBroadcastNotification(
  type: string,
  actorId: string,
  apartmentId: string,
  title: string,
  message: string,
  excludeActorFromNotification = true
) {
  try {
    // Get all users except the actor to notify them
    const targetUsers = Array.from(userConnections.keys()).filter(userId => 
      excludeActorFromNotification ? userId !== actorId : true
    );

    if (targetUsers.length === 0) {
      console.log('No users to notify');
      return;
    }

    // Create notifications in database for each user
    const notificationPromises = targetUsers.map(async (userId) => {
      const notificationData: InsertNotification = {
        userId,
        actorId,
        apartmentId,
        type,
        title,
        message,
        isRead: false,
      };

      const notification = await storage.createNotification(notificationData);
      
      // Send real-time notification via WebSocket
      await sendNotificationToUser(userId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt,
        apartmentId: notification.apartmentId,
      });

      return notification;
    });

    await Promise.all(notificationPromises);
    console.log(`Created and sent ${targetUsers.length} notifications for ${type}`);
    
  } catch (error) {
    console.error('Error creating and broadcasting notification:', error);
  }
}

// Helper function to get the display name for a user
export function getUserDisplayName(user: { firstName: string | null; lastName: string | null; email: string | null }): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  } else if (user.firstName) {
    return user.firstName;
  } else if (user.email) {
    return user.email.split('@')[0];
  }
  return 'Someone';
}

export function getActiveUserCount(): number {
  return userConnections.size;
}

export function getActiveConnectionCount(): number {
  let total = 0;
  for (const connections of Array.from(userConnections.values())) {
    total += connections.size;
  }
  return total;
}