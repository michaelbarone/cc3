import { Prisma } from "@prisma/client";

// Augment the PrismaClient to ensure all models are available
declare module "@prisma/client" {
  export interface PrismaClient {
    appConfig: Prisma.AppConfigDelegate<Prisma.PrismaClientOptions>;
    user: Prisma.UserDelegate<Prisma.PrismaClientOptions>;
    urlGroup: Prisma.UrlGroupDelegate<Prisma.PrismaClientOptions>;
    url: Prisma.UrlDelegate<Prisma.PrismaClientOptions>;
    urlsInGroups: Prisma.UrlsInGroupsDelegate<Prisma.PrismaClientOptions>;
    userUrlGroup: Prisma.UserUrlGroupDelegate<Prisma.PrismaClientOptions>;
    userSetting: Prisma.UserSettingDelegate<Prisma.PrismaClientOptions>;
  }
}

// This enables us to import the extended PrismaClient type in other files
export {};
