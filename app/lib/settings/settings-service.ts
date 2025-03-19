import { prisma } from "../db/prisma";
import { SettingsService } from "./types";

/**
 * Implementation of the settings service using Prisma
 */
export class PrismaSettingsService implements SettingsService {
  /**
   * Get a setting value for a user
   */
  async getSetting<T>(userId: string, key: string): Promise<T | null> {
    const setting = await prisma.userSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key,
        },
      },
      select: {
        value: true,
      },
    });

    return setting ? (JSON.parse(setting.value) as T) : null;
  }

  /**
   * Set a setting value for a user
   */
  async setSetting<T>(userId: string, key: string, value: T): Promise<void> {
    await prisma.userSetting.upsert({
      where: {
        userId_key: {
          userId,
          key,
        },
      },
      update: {
        value: JSON.stringify(value),
        updatedAt: new Date(),
      },
      create: {
        userId,
        key,
        value: JSON.stringify(value),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete a setting for a user
   */
  async deleteSetting(userId: string, key: string): Promise<void> {
    await prisma.userSetting.delete({
      where: {
        userId_key: {
          userId,
          key,
        },
      },
    });
  }

  /**
   * Get all settings for a user
   */
  async getAllSettings(userId: string): Promise<Record<string, unknown>> {
    const settings = await prisma.userSetting.findMany({
      where: {
        userId,
      },
      select: {
        key: true,
        value: true,
      },
    });

    return settings.reduce(
      (acc: Record<string, unknown>, setting: { key: string; value: string }) => {
        acc[setting.key] = JSON.parse(setting.value);
        return acc;
      },
      {} as Record<string, unknown>,
    );
  }
}

// Export a singleton instance
export const settingsService = new PrismaSettingsService();
