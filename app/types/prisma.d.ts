/**
 * Type definitions for Prisma models based on schema.prisma
 * These type definitions should be manually kept in sync with the schema
 */

// Model interfaces based on schema.prisma
export interface User {
  id: string;
  username: string;
  passwordHash: string | null;
  isAdmin: boolean;
  lastActiveUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  avatarUrl: string | null;
  menuPosition: string | null;
  themeMode: string | null;
  lastLoginAt: Date | null;
}

export interface UrlGroup {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Url {
  id: string;
  title: string;
  url: string;
  urlMobile: string | null;
  iconPath: string | null;
  idleTimeoutMinutes: number;
  isLocalhost: boolean;
  port: string | null;
  path: string | null;
  localhostMobilePath: string | null;
  localhostMobilePort: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UrlsInGroups {
  urlId: string;
  groupId: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserUrlGroup {
  userId: string;
  urlGroupId: string;
  createdAt: Date;
}

export interface AppConfig {
  id: string;
  appName: string;
  appLogo: string | null;
  favicon: string | null;
  loginTheme: string;
  registrationEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSetting {
  userId: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

// Type safe field names for Prisma queries
export type UserScalarFieldEnum =
  | "id"
  | "username"
  | "passwordHash"
  | "isAdmin"
  | "lastActiveUrl"
  | "createdAt"
  | "updatedAt"
  | "avatarUrl"
  | "menuPosition"
  | "themeMode"
  | "lastLoginAt";

export type UrlGroupScalarFieldEnum = "id" | "name" | "description" | "createdAt" | "updatedAt";

export type UrlScalarFieldEnum =
  | "id"
  | "title"
  | "url"
  | "urlMobile"
  | "iconPath"
  | "idleTimeoutMinutes"
  | "isLocalhost"
  | "port"
  | "path"
  | "localhostMobilePath"
  | "localhostMobilePort"
  | "createdAt"
  | "updatedAt";

// Type augmentation to help TypeScript recognize Prisma enums
declare global {
  namespace PrismaJson {
    // Custom scalar JSON types
  }
}

// Export a type-safe PrismaClient for use in app
export type TypedPrismaClient = Prisma.PrismaClientOptions;

// Declare Prisma client shape to include our models
declare global {
  // Extend the PrismaClient interface to ensure TypeScript recognizes our models
  namespace PrismaClient {
    interface PrismaClient {
      appConfig: {
        findUnique: (args: any) => Promise<AppConfig | null>;
        findFirst: (args: any) => Promise<AppConfig | null>;
        findMany: (args: any) => Promise<AppConfig[]>;
        create: (args: any) => Promise<AppConfig>;
        update: (args: any) => Promise<AppConfig>;
        upsert: (args: any) => Promise<AppConfig>;
        delete: (args: any) => Promise<AppConfig>;
        deleteMany: (args: any) => Promise<{ count: number }>;
        updateMany: (args: any) => Promise<{ count: number }>;
        count: (args: any) => Promise<number>;
      };
    }
  }
}
