import { MenuPosition, Theme, UserSettingsUpdateRequest } from "@/app/types/user-settings";
import { prisma } from "@/lib/db/prisma";

/**
 * Get user settings by user ID
 */
export async function getUserSettings(userId: string) {
  const settings = await prisma.userSetting.findUnique({
    where: { userId },
  });

  return settings;
}

/**
 * Update user settings
 */
export async function updateUserSettings(userId: string, data: UserSettingsUpdateRequest) {
  const settings = await prisma.userSetting.update({
    where: { userId },
    data,
  });

  return settings;
}

/**
 * Create user settings with defaults for a new user
 */
export async function createDefaultUserSettings(userId: string) {
  const settings = await prisma.userSetting.create({
    data: {
      userId,
      theme: Theme.SYSTEM,
      menuPosition: MenuPosition.TOP,
    },
  });

  return settings;
}

/**
 * Get user settings or create default if not found
 */
export async function getUserSettingsOrCreateDefault(userId: string) {
  const settings = await prisma.userSetting.findUnique({
    where: { userId },
  });

  if (!settings) {
    return createDefaultUserSettings(userId);
  }

  return settings;
}
