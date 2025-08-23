import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertApartmentSchema, updateApartmentSchema, insertCommentSchema, insertFavoriteSchema, insertLabelSchema, insertApartmentLabelSchema } from "@shared/schema";
import { z } from "zod";
import { 
  addUserConnection, 
  createAndBroadcastNotification, 
  getUserDisplayName 
} from "./notificationService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Apartment routes
  app.get('/api/apartments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const apartments = await storage.getApartments(userId);
      res.json(apartments);
    } catch (error) {
      console.error("Error fetching apartments:", error);
      res.status(500).json({ message: "Failed to fetch apartments" });
    }
  });

  app.get('/api/apartments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const apartment = await storage.getApartment(id, userId);
      if (!apartment) {
        return res.status(404).json({ message: "Apartment not found" });
      }
      res.json(apartment);
    } catch (error) {
      console.error("Error fetching apartment:", error);
      res.status(500).json({ message: "Failed to fetch apartment" });
    }
  });

  app.post('/api/apartments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const apartmentData = insertApartmentSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      
      const apartment = await storage.createApartment(apartmentData);
      
      // Get user info for notifications
      const user = await storage.getUser(userId);
      const userName = getUserDisplayName(user || { firstName: null, lastName: null, email: null });
      
      // Create and broadcast notification
      await createAndBroadcastNotification(
        'apartment_created',
        userId,
        apartment.id,
        'New Apartment Added',
        `${userName} added a new apartment: ${apartment.label || apartment.address}`
      );
      
      res.status(201).json(apartment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid apartment data", errors: error.errors });
      }
      console.error("Error creating apartment:", error);
      res.status(500).json({ message: "Failed to create apartment" });
    }
  });

  app.patch('/api/apartments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const apartmentData = updateApartmentSchema.parse(req.body);
      
      const apartment = await storage.updateApartment(id, apartmentData);
      if (!apartment) {
        return res.status(404).json({ message: "Apartment not found" });
      }
      
      // Note: No notification needed for apartment updates
      
      res.json(apartment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid apartment data", errors: error.errors });
      }
      console.error("Error updating apartment:", error);
      res.status(500).json({ message: "Failed to update apartment" });
    }
  });

  app.delete('/api/apartments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteApartment(id);
      
      // Note: No notification needed for apartment deletion
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting apartment:", error);
      res.status(500).json({ message: "Failed to delete apartment" });
    }
  });

  // Comment routes
  app.get('/api/apartments/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const comments = await storage.getComments(id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post('/api/apartments/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id: apartmentId } = req.params;
      
      const commentData = insertCommentSchema.parse({
        ...req.body,
        apartmentId,
        userId,
      });
      
      const comment = await storage.createComment(commentData);
      
      // Get user info for notifications
      const user = await storage.getUser(userId);
      const userName = getUserDisplayName(user || { firstName: null, lastName: null, email: null });
      
      // Get apartment info for context
      const apartment = await storage.getApartment(apartmentId, userId);
      
      if (apartment) {
        // Create and broadcast notification
        await createAndBroadcastNotification(
          'comment_created',
          userId,
          apartmentId,
          'New Comment Added',
          `${userName} commented on ${apartment.label || apartment.address}: ${comment.text.length > 50 ? comment.text.substring(0, 50) + '...' : comment.text}`
        );
      }
      
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.delete('/api/comments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteComment(id);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // Favorite routes
  app.get('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post('/api/apartments/:id/favorite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id: apartmentId } = req.params;
      
      const favoriteData = insertFavoriteSchema.parse({
        apartmentId,
        userId,
      });
      
      const isFavorited = await storage.toggleFavorite(favoriteData);
      
      // Create and broadcast notification for favorite toggle
      const apartment = await storage.getApartment(apartmentId, userId);
      if (apartment && isFavorited) {
        const user = await storage.getUser(userId);
        const userDisplayName = getUserDisplayName(user || { firstName: null, lastName: null, email: null });
        await createAndBroadcastNotification(
          'favorite_created',
          userId,
          apartmentId,
          'Apartment Favorited',
          `${userDisplayName} marked "${apartment.label}" as a favorite`
        );
      }
      
      res.json({ isFavorited });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid favorite data", errors: error.errors });
      }
      console.error("Error toggling favorite:", error);
      res.status(500).json({ message: "Failed to toggle favorite" });
    }
  });

  // Toggle deleted status
  app.post("/api/apartments/:id/toggle-deleted", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      const result = await storage.toggleDeleted(id, userId);
      
      res.json(result);
    } catch (error) {
      console.error("Error toggling deleted status:", error);
      res.status(500).json({ message: "Failed to toggle deleted status" });
    }
  });

  // Label routes
  app.get('/api/labels', isAuthenticated, async (req: any, res) => {
    try {
      const labels = await storage.getLabels();
      res.json(labels);
    } catch (error) {
      console.error("Error fetching labels:", error);
      res.status(500).json({ message: "Failed to fetch labels" });
    }
  });

  app.post('/api/labels', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const labelData = insertLabelSchema.parse(req.body);
      
      // Add the createdBy field manually since it's omitted from the schema
      const fullLabelData = {
        ...labelData,
        createdBy: userId,
      };
      
      const label = await storage.createLabel(fullLabelData);
      
      // Note: No notification needed for label creation
      
      res.status(201).json(label);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid label data", errors: error.errors });
      }
      console.error("Error creating label:", error);
      res.status(500).json({ message: "Failed to create label" });
    }
  });

  app.get('/api/apartments/:id/labels', isAuthenticated, async (req: any, res) => {
    try {
      const { id: apartmentId } = req.params;
      const labels = await storage.getApartmentLabels(apartmentId);
      res.json(labels);
    } catch (error) {
      console.error("Error fetching apartment labels:", error);
      res.status(500).json({ message: "Failed to fetch apartment labels" });
    }
  });

  app.post('/api/apartments/:id/labels', isAuthenticated, async (req: any, res) => {
    try {
      const { id: apartmentId } = req.params;
      const { labelId } = req.body;
      
      const apartmentLabelData = insertApartmentLabelSchema.parse({
        apartmentId,
        labelId,
      });
      
      await storage.addLabelToApartment(apartmentLabelData);
      
      // Note: No notification needed for adding labels to apartments
      
      res.status(201).json({ message: "Label added to apartment" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid apartment label data", errors: error.errors });
      }
      console.error("Error adding label to apartment:", error);
      res.status(500).json({ message: "Failed to add label to apartment" });
    }
  });

  app.delete('/api/apartments/:apartmentId/labels/:labelId', isAuthenticated, async (req: any, res) => {
    try {
      const { apartmentId, labelId } = req.params;
      
      await storage.removeLabelFromApartment(apartmentId, labelId);
      
      // Note: No notification needed for removing labels from apartments
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing label from apartment:", error);
      res.status(500).json({ message: "Failed to remove label from apartment" });
    }
  });

  // Notification routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      await storage.markNotificationAsRead(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch('/api/notifications/read-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Push notification routes
  app.post('/api/push/subscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subscription } = req.body;
      
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ message: "Invalid subscription data" });
      }

      await storage.savePushSubscription(userId, subscription);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving push subscription:", error);
      res.status(500).json({ message: "Failed to save push subscription" });
    }
  });

  app.post('/api/push/unsubscribe', isAuthenticated, async (req: any, res) => {
    try {
      const { endpoint } = req.body;
      
      if (!endpoint) {
        return res.status(400).json({ message: "Endpoint is required" });
      }

      await storage.removePushSubscription(endpoint);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing push subscription:", error);
      res.status(500).json({ message: "Failed to remove push subscription" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket, req) => {
    console.log('New WebSocket connection');
    
    // Store user ID when they connect (will be set via authentication message)
    let userId: string | null = null;

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'authenticate' && data.userId) {
          userId = data.userId;
          addUserConnection(userId!, ws);
          ws.send(JSON.stringify({ type: 'authenticated', userId }));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      // Connection cleanup is handled automatically in addUserConnection
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return httpServer;
}
