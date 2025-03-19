-- CreateTable
CREATE TABLE "UserSetting" (
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("userId", "key"),
    CONSTRAINT "UserSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "lastActiveUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "avatarUrl" TEXT,
    "menuPosition" TEXT DEFAULT 'side',
    "themeMode" TEXT DEFAULT 'light'
);
INSERT INTO "new_User" ("avatarUrl", "createdAt", "id", "isAdmin", "lastActiveUrl", "menuPosition", "passwordHash", "themeMode", "updatedAt", "username") SELECT "avatarUrl", "createdAt", "id", "isAdmin", "lastActiveUrl", "menuPosition", "passwordHash", "themeMode", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
