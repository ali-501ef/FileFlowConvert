import { users, conversions, type User, type InsertUser, type Conversion, type InsertConversion } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createConversion(conversion: InsertConversion): Promise<Conversion>;
  getUserConversions(userId: string): Promise<Conversion[]>;
  getConversionStats(): Promise<{ totalConversions: number; toolStats: Record<string, number> }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createConversion(insertConversion: InsertConversion): Promise<Conversion> {
    const [conversion] = await db
      .insert(conversions)
      .values(insertConversion)
      .returning();
    return conversion;
  }

  async getUserConversions(userId: string): Promise<Conversion[]> {
    return await db
      .select()
      .from(conversions)
      .where(eq(conversions.userId, userId))
      .orderBy(desc(conversions.createdAt));
  }

  async getConversionStats(): Promise<{ totalConversions: number; toolStats: Record<string, number> }> {
    const allConversions = await db.select().from(conversions);
    const totalConversions = allConversions.length;
    const toolStats: Record<string, number> = {};
    
    allConversions.forEach(conv => {
      toolStats[conv.toolType] = (toolStats[conv.toolType] || 0) + 1;
    });

    return { totalConversions, toolStats };
  }
}

export const storage = new DatabaseStorage();
