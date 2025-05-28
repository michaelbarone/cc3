import "@prisma/client";

declare global {
  namespace PrismaJson {
    // Add any JSON types here if needed
  }
}

// Fix the UserWhereInput type to include the name field
declare module "@prisma/client/runtime/library" {
  // Define StringFilter type for Prisma filters
  interface StringFilter {
    equals?: string;
    in?: string[];
    notIn?: string[];
    lt?: string;
    lte?: string;
    gt?: string;
    gte?: string;
    contains?: string;
    startsWith?: string;
    endsWith?: string;
    not?: string | StringFilter;
  }

  interface UserWhereInput {
    name?: string | StringFilter;
  }
}

// Make sure Prisma types match our schema exactly
declare module "@prisma/client" {
  export interface User {
    id: string;
    name: string;
    passwordHash: string | null;
    avatarUrl: string | null;
    role: string;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    settings?: UserSetting | null;
  }

  export interface UserSetting {
    userId: string;
    theme: string;
    menuPosition: string;
    createdAt: Date;
    updatedAt: Date;
  }
}

export {};
