import { PrismaClient } from "@prisma/client";

/**
 * Extended PrismaClient type for better type safety
 * This simplifies Prisma client usage throughout the app
 */
export type ExtendedPrismaClient = PrismaClient;

/**
 * Transaction client type for use in $transaction callbacks
 * Excludes connection and transaction methods
 */
export type TransactionClient = Omit<
  ExtendedPrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;
