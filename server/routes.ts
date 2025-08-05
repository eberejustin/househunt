import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertApartmentSchema, updateApartmentSchema, insertCommentSchema, insertFavoriteSchema, insertLabelSchema, insertApartmentLabelSchema } from "@shared/schema";
import { z } from "zod";

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
      
      // Broadcast to WebSocket clients
      broadcastToClients('apartment_created', apartment);
      
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
      
      // Broadcast to WebSocket clients
      broadcastToClients('apartment_updated', apartment);
      
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
      
      // Broadcast to WebSocket clients
      broadcastToClients('apartment_deleted', { id });
      
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
      
      // Broadcast to WebSocket clients
      broadcastToClients('comment_created', { apartmentId, comment });
      
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
      
      // Broadcast to WebSocket clients
      broadcastToClients('comment_deleted', { id });
      
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
      
      // Broadcast to WebSocket clients
      broadcastToClients('favorite_toggled', { apartmentId, userId, isFavorited });
      
      res.json({ isFavorited });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid favorite data", errors: error.errors });
      }
      console.error("Error toggling favorite:", error);
      res.status(500).json({ message: "Failed to toggle favorite" });
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
      
      // Broadcast to WebSocket clients
      broadcastToClients('label_created', label);
      
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
      
      // Broadcast to WebSocket clients
      broadcastToClients('apartment_label_added', { apartmentId, labelId });
      
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
      
      // Broadcast to WebSocket clients
      broadcastToClients('apartment_label_removed', { apartmentId, labelId });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing label from apartment:", error);
      res.status(500).json({ message: "Failed to remove label from apartment" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time collaboration
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Function to broadcast to all connected WebSocket clients
  function broadcastToClients(type: string, data: any) {
    const message = JSON.stringify({ type, data });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Make broadcastToClients available globally for use in routes
  (global as any).broadcastToClients = broadcastToClients;

  return httpServer;
}
