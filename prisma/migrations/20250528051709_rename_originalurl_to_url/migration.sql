/*
  Warnings:

  - You are about to drop the column `originalUrl` on the `Url` table. All the data in the column will be lost.
  - Added the required column `url` to the `Url` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Url" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "faviconUrl" TEXT,
    "mobileSpecificUrl" TEXT,
    "notes" TEXT,
    "addedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Url_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Url" ("addedById", "createdAt", "faviconUrl", "id", "mobileSpecificUrl", "notes", "title", "updatedAt") SELECT "addedById", "createdAt", "faviconUrl", "id", "mobileSpecificUrl", "notes", "title", "updatedAt" FROM "Url";
DROP TABLE "Url";
ALTER TABLE "new_Url" RENAME TO "Url";
CREATE UNIQUE INDEX "Url_url_key" ON "Url"("url");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
