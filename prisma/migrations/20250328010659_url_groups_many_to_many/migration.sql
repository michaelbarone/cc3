/*
  Warnings:

  - You are about to drop the column `displayOrder` on the `Url` table. All the data in the column will be lost.
  - You are about to drop the column `urlGroupId` on the `Url` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "UrlsInGroups" (
    "urlId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("urlId", "groupId"),
    CONSTRAINT "UrlsInGroups_urlId_fkey" FOREIGN KEY ("urlId") REFERENCES "Url" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UrlsInGroups_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "UrlGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Url" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "urlMobile" TEXT,
    "iconPath" TEXT,
    "idleTimeoutMinutes" INTEGER NOT NULL DEFAULT 10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Migrate existing data including relationships
INSERT INTO "new_Url" ("createdAt", "iconPath", "id", "idleTimeoutMinutes", "title", "updatedAt", "url", "urlMobile")
SELECT "createdAt", "iconPath", "id", "idleTimeoutMinutes", "title", "updatedAt", "url", "urlMobile" FROM "Url";

-- Preserve existing relationships and order in the new join table
INSERT INTO "UrlsInGroups" ("urlId", "groupId", "displayOrder", "createdAt", "updatedAt")
SELECT "id", "urlGroupId", "displayOrder", "createdAt", "updatedAt"
FROM "Url"
WHERE "urlGroupId" IS NOT NULL;

DROP TABLE "Url";
ALTER TABLE "new_Url" RENAME TO "Url";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "UrlsInGroups_groupId_displayOrder_idx" ON "UrlsInGroups"("groupId", "displayOrder");
