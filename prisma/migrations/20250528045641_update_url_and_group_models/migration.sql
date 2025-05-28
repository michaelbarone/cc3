/*
  Warnings:

  - You are about to drop the column `faviconPath` on the `Url` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `Url` table. All the data in the column will be lost.
  - You are about to drop the column `displayOrder` on the `UrlInGroup` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `UrlInGroup` table. All the data in the column will be lost.
  - Added the required column `originalUrl` to the `Url` table without a default value. This is not possible if the table is not empty.
  - Added the required column `displayOrderInGroup` to the `UrlInGroup` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Group" ADD COLUMN "description" TEXT;
ALTER TABLE "Group" ADD COLUMN "displayOrder" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Url" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "faviconUrl" TEXT,
    "mobileSpecificUrl" TEXT,
    "notes" TEXT,
    "addedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Url_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Url" ("addedById", "createdAt", "id", "title", "updatedAt") SELECT "addedById", "createdAt", "id", "title", "updatedAt" FROM "Url";
DROP TABLE "Url";
ALTER TABLE "new_Url" RENAME TO "Url";
CREATE UNIQUE INDEX "Url_originalUrl_key" ON "Url"("originalUrl");
CREATE TABLE "new_UrlInGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "urlId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "groupSpecificTitle" TEXT,
    "displayOrderInGroup" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UrlInGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UrlInGroup_urlId_fkey" FOREIGN KEY ("urlId") REFERENCES "Url" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UrlInGroup" ("createdAt", "groupId", "id", "updatedAt", "urlId") SELECT "createdAt", "groupId", "id", "updatedAt", "urlId" FROM "UrlInGroup";
DROP TABLE "UrlInGroup";
ALTER TABLE "new_UrlInGroup" RENAME TO "UrlInGroup";
CREATE UNIQUE INDEX "UrlInGroup_urlId_groupId_key" ON "UrlInGroup"("urlId", "groupId");
CREATE TABLE "new_UserSetting" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "theme" TEXT NOT NULL DEFAULT 'SYSTEM',
    "menuPosition" TEXT NOT NULL DEFAULT 'TOP',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserSetting" ("createdAt", "menuPosition", "theme", "updatedAt", "userId") SELECT "createdAt", "menuPosition", "theme", "updatedAt", "userId" FROM "UserSetting";
DROP TABLE "UserSetting";
ALTER TABLE "new_UserSetting" RENAME TO "UserSetting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
