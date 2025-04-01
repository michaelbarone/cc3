/*
  Warnings:

  - You are about to drop the `UrlInGroup` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UrlInGroup";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "urls_in_groups" (
    "urlId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("urlId", "groupId"),
    CONSTRAINT "urls_in_groups_urlId_fkey" FOREIGN KEY ("urlId") REFERENCES "Url" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "urls_in_groups_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "UrlGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "urls_in_groups_groupId_displayOrder_idx" ON "urls_in_groups"("groupId", "displayOrder");
