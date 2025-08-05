import {
  users,
  apartments,
  comments,
  favorites,
  labels,
  apartmentLabels,
  type User,
  type UpsertUser,
  type Apartment,
  type InsertApartment,
  type UpdateApartment,
  type Comment,
  type InsertComment,
  type Favorite,
  type InsertFavorite,
  type Label,
  type InsertLabel,
  type ApartmentLabel,
  type InsertApartmentLabel,
  type ApartmentWithDetails,
  type CommentWithUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, inArray, and } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Apartment operations
  getApartments(userId: string): Promise<ApartmentWithDetails[]>;
  getApartment(id: string, userId: string): Promise<ApartmentWithDetails | undefined>;
  createApartment(apartment: InsertApartment): Promise<Apartment>;
  updateApartment(id: string, apartment: UpdateApartment): Promise<Apartment | undefined>;
  deleteApartment(id: string): Promise<void>;
  toggleDeleted(id: string, userId: string): Promise<ApartmentWithDetails>;
  
  // Comment operations
  getComments(apartmentId: string): Promise<CommentWithUser[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: string): Promise<void>;
  
  // Favorite operations
  getFavorites(userId: string): Promise<string[]>;
  toggleFavorite(favorite: InsertFavorite): Promise<boolean>;
  
  // Label operations
  getLabels(): Promise<Label[]>;
  createLabel(label: InsertLabel): Promise<Label>;
  getApartmentLabels(apartmentId: string): Promise<Label[]>;
  addLabelToApartment(apartmentLabel: InsertApartmentLabel): Promise<void>;
  removeLabelFromApartment(apartmentId: string, labelId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getApartments(userId: string): Promise<ApartmentWithDetails[]> {
    const result = await db
      .select({
        id: apartments.id,
        label: apartments.label,
        address: apartments.address,
        latitude: apartments.latitude,
        longitude: apartments.longitude,
        rent: apartments.rent,
        bedrooms: apartments.bedrooms,
        bathrooms: apartments.bathrooms,
        status: apartments.status,
        notes: apartments.notes,
        listingLink: apartments.listingLink,
        createdBy: apartments.createdBy,
        createdAt: apartments.createdAt,
        updatedAt: apartments.updatedAt,
        isDeleted: apartments.isDeleted,
        commentCount: sql<number>`CAST(COUNT(DISTINCT ${comments.id}) AS INTEGER)`,
        isFavorited: sql<boolean>`CAST(COUNT(DISTINCT ${favorites.id}) > 0 AS BOOLEAN)`,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
      })
      .from(apartments)
      .leftJoin(comments, eq(comments.apartmentId, apartments.id))
      .leftJoin(favorites, sql`${favorites.apartmentId} = ${apartments.id} AND ${favorites.userId} = ${userId}`)
      .leftJoin(users, eq(users.id, apartments.createdBy))
      .groupBy(apartments.id, users.firstName, users.lastName)
      .orderBy(desc(apartments.updatedAt));

    // Get labels for each apartment
    const apartmentIds = result.map(row => row.id);
    const labelsData = apartmentIds.length > 0 ? await this.getLabelsForApartments(apartmentIds) : [];
    
    return result.map(row => ({
      id: row.id,
      label: row.label,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      rent: row.rent,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      status: row.status,
      notes: row.notes,
      listingLink: row.listingLink,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      isDeleted: row.isDeleted,
      commentCount: row.commentCount,
      isFavorited: row.isFavorited,
      labels: labelsData.filter(labelData => labelData.apartmentId === row.id).map(labelData => labelData.label),
      createdByUser: {
        firstName: row.createdByFirstName,
        lastName: row.createdByLastName,
      },
    }));
  }

  async getApartment(id: string, userId: string): Promise<ApartmentWithDetails | undefined> {
    const result = await db
      .select({
        id: apartments.id,
        label: apartments.label,
        address: apartments.address,
        latitude: apartments.latitude,
        longitude: apartments.longitude,
        rent: apartments.rent,
        bedrooms: apartments.bedrooms,
        bathrooms: apartments.bathrooms,
        status: apartments.status,
        notes: apartments.notes,
        listingLink: apartments.listingLink,
        createdBy: apartments.createdBy,
        createdAt: apartments.createdAt,
        updatedAt: apartments.updatedAt,
        isDeleted: apartments.isDeleted,
        commentCount: sql<number>`CAST(COUNT(DISTINCT ${comments.id}) AS INTEGER)`,
        isFavorited: sql<boolean>`CAST(COUNT(DISTINCT ${favorites.id}) > 0 AS BOOLEAN)`,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
      })
      .from(apartments)
      .leftJoin(comments, eq(comments.apartmentId, apartments.id))
      .leftJoin(favorites, sql`${favorites.apartmentId} = ${apartments.id} AND ${favorites.userId} = ${userId}`)
      .leftJoin(users, eq(users.id, apartments.createdBy))
      .where(eq(apartments.id, id))
      .groupBy(apartments.id, users.firstName, users.lastName);

    const [row] = result;
    if (!row) return undefined;

    const apartmentLabels = await this.getApartmentLabels(row.id);

    return {
      id: row.id,
      label: row.label,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      rent: row.rent,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      status: row.status,
      notes: row.notes,
      listingLink: row.listingLink,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      isDeleted: row.isDeleted,
      commentCount: row.commentCount,
      isFavorited: row.isFavorited,
      labels: apartmentLabels,
      createdByUser: {
        firstName: row.createdByFirstName,
        lastName: row.createdByLastName,
      },
    };
  }

  async createApartment(apartment: InsertApartment): Promise<Apartment> {
    const [created] = await db
      .insert(apartments)
      .values(apartment)
      .returning();
    return created;
  }

  async updateApartment(id: string, apartment: UpdateApartment): Promise<Apartment | undefined> {
    const [updated] = await db
      .update(apartments)
      .set({ ...apartment, updatedAt: new Date() })
      .where(eq(apartments.id, id))
      .returning();
    return updated;
  }

  async deleteApartment(id: string): Promise<void> {
    await db.delete(apartments).where(eq(apartments.id, id));
  }

  async toggleDeleted(id: string, userId: string): Promise<ApartmentWithDetails> {
    // First get the current apartment to check ownership and get current state
    const current = await db
      .select({ isDeleted: apartments.isDeleted, createdBy: apartments.createdBy })
      .from(apartments)
      .where(eq(apartments.id, id));

    if (!current.length) {
      throw new Error("Apartment not found");
    }

    if (current[0].createdBy !== userId) {
      throw new Error("Unauthorized to modify this apartment");
    }

    // Toggle the deleted status
    const newDeletedStatus = !current[0].isDeleted;
    await db
      .update(apartments)
      .set({ isDeleted: newDeletedStatus, updatedAt: new Date() })
      .where(eq(apartments.id, id));

    // Return the updated apartment with full details
    const updated = await this.getApartment(id, userId);
    if (!updated) {
      throw new Error("Failed to retrieve updated apartment");
    }
    
    return updated;
  }

  async getComments(apartmentId: string): Promise<CommentWithUser[]> {
    const result = await db
      .select({
        id: comments.id,
        apartmentId: comments.apartmentId,
        userId: comments.userId,
        text: comments.text,
        createdAt: comments.createdAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userProfileImageUrl: users.profileImageUrl,
      })
      .from(comments)
      .leftJoin(users, eq(users.id, comments.userId))
      .where(eq(comments.apartmentId, apartmentId))
      .orderBy(comments.createdAt);

    return result.map(row => ({
      id: row.id,
      apartmentId: row.apartmentId,
      userId: row.userId,
      text: row.text,
      createdAt: row.createdAt,
      user: {
        firstName: row.userFirstName,
        lastName: row.userLastName,
        profileImageUrl: row.userProfileImageUrl,
      },
    }));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [created] = await db
      .insert(comments)
      .values(comment)
      .returning();
    return created;
  }

  async deleteComment(id: string): Promise<void> {
    await db.delete(comments).where(eq(comments.id, id));
  }

  async getFavorites(userId: string): Promise<string[]> {
    const result = await db
      .select({ apartmentId: favorites.apartmentId })
      .from(favorites)
      .where(eq(favorites.userId, userId));
    
    return result.map(row => row.apartmentId);
  }

  async toggleFavorite(favorite: InsertFavorite): Promise<boolean> {
    const existing = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.apartmentId, favorite.apartmentId), eq(favorites.userId, favorite.userId)));

    if (existing.length > 0) {
      await db
        .delete(favorites)
        .where(and(eq(favorites.apartmentId, favorite.apartmentId), eq(favorites.userId, favorite.userId)));
      return false;
    } else {
      await db.insert(favorites).values(favorite);
      return true;
    }
  }

  // Label methods
  async getLabels(): Promise<Label[]> {
    return await db.select().from(labels).orderBy(labels.name);
  }

  async createLabel(label: any): Promise<Label> {
    const [created] = await db
      .insert(labels)
      .values(label)
      .returning();
    return created;
  }

  async getApartmentLabels(apartmentId: string): Promise<Label[]> {
    const result = await db
      .select({
        id: labels.id,
        name: labels.name,
        color: labels.color,
        createdBy: labels.createdBy,
        createdAt: labels.createdAt,
      })
      .from(apartmentLabels)
      .innerJoin(labels, eq(apartmentLabels.labelId, labels.id))
      .where(eq(apartmentLabels.apartmentId, apartmentId))
      .orderBy(labels.name);
    
    return result;
  }

  async addLabelToApartment(apartmentLabel: InsertApartmentLabel): Promise<void> {
    await db.insert(apartmentLabels).values(apartmentLabel);
  }

  async removeLabelFromApartment(apartmentId: string, labelId: string): Promise<void> {
    await db
      .delete(apartmentLabels)
      .where(and(eq(apartmentLabels.apartmentId, apartmentId), eq(apartmentLabels.labelId, labelId)));
  }

  // Helper method to get labels for multiple apartments
  private async getLabelsForApartments(apartmentIds: string[]): Promise<Array<{apartmentId: string, label: Label}>> {
    if (apartmentIds.length === 0) return [];
    
    const result = await db
      .select({
        apartmentId: apartmentLabels.apartmentId,
        labelId: labels.id,
        labelName: labels.name,
        labelColor: labels.color,
        labelCreatedBy: labels.createdBy,
        labelCreatedAt: labels.createdAt,
      })
      .from(apartmentLabels)
      .innerJoin(labels, eq(apartmentLabels.labelId, labels.id))
      .where(inArray(apartmentLabels.apartmentId, apartmentIds))
      .orderBy(labels.name);
    
    return result.map(row => ({
      apartmentId: row.apartmentId,
      label: {
        id: row.labelId,
        name: row.labelName,
        color: row.labelColor,
        createdBy: row.labelCreatedBy,
        createdAt: row.labelCreatedAt,
      }
    }));
  }
}

export const storage = new DatabaseStorage();
