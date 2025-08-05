import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  real,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Apartments table
export const apartments = pgTable("apartments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  label: text("label").notNull(),
  address: text("address").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  rent: varchar("rent"),
  bedrooms: varchar("bedrooms"),
  notes: text("notes"),
  listingLink: text("listing_link"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Comments table
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apartmentId: varchar("apartment_id").notNull().references(() => apartments.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User favorites table
export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apartmentId: varchar("apartment_id").notNull().references(() => apartments.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Labels table - global labels that can be applied to apartments
export const labels = pgTable("labels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull().unique(),
  color: varchar("color", { length: 7 }).notNull().default('#3B82F6'), // hex color code
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Junction table for apartment-label relationships
export const apartmentLabels = pgTable("apartment_labels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apartmentId: varchar("apartment_id").notNull().references(() => apartments.id, { onDelete: 'cascade' }),
  labelId: varchar("label_id").notNull().references(() => labels.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  apartments: many(apartments),
  comments: many(comments),
  favorites: many(favorites),
  labels: many(labels),
}));

export const apartmentsRelations = relations(apartments, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [apartments.createdBy],
    references: [users.id],
  }),
  comments: many(comments),
  favorites: many(favorites),
  apartmentLabels: many(apartmentLabels),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  apartment: one(apartments, {
    fields: [comments.apartmentId],
    references: [apartments.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  apartment: one(apartments, {
    fields: [favorites.apartmentId],
    references: [apartments.id],
  }),
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
}));

export const labelsRelations = relations(labels, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [labels.createdBy],
    references: [users.id],
  }),
  apartmentLabels: many(apartmentLabels),
}));

export const apartmentLabelsRelations = relations(apartmentLabels, ({ one }) => ({
  apartment: one(apartments, {
    fields: [apartmentLabels.apartmentId],
    references: [apartments.id],
  }),
  label: one(labels, {
    fields: [apartmentLabels.labelId],
    references: [labels.id],
  }),
}));

// Insert schemas
export const insertApartmentSchema = createInsertSchema(apartments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  rent: z.string().optional().nullable(),
  bedrooms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  listingLink: z.string().url().optional().nullable(),
});

export const updateApartmentSchema = insertApartmentSchema.partial();

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export const insertLabelSchema = createInsertSchema(labels).omit({
  id: true,
  createdAt: true,
  createdBy: true, // Server will set this from authenticated user
}).extend({
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code"),
});

export const insertApartmentLabelSchema = createInsertSchema(apartmentLabels).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type Apartment = typeof apartments.$inferSelect;
export type InsertApartment = z.infer<typeof insertApartmentSchema>;
export type UpdateApartment = z.infer<typeof updateApartmentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Label = typeof labels.$inferSelect;
export type InsertLabel = z.infer<typeof insertLabelSchema>;
export type ApartmentLabel = typeof apartmentLabels.$inferSelect;
export type InsertApartmentLabel = z.infer<typeof insertApartmentLabelSchema>;

// Extended types for API responses
export type ApartmentWithDetails = Apartment & {
  commentCount: number;
  isFavorited: boolean;
  labels: Label[];
  createdByUser: {
    firstName: string | null;
    lastName: string | null;
  };
};

export type CommentWithUser = Comment & {
  user: {
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
};
