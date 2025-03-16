-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Url" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "urlGroupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "iconPath" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "idleTimeoutMinutes" INTEGER NOT NULL DEFAULT 10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Url_urlGroupId_fkey" FOREIGN KEY ("urlGroupId") REFERENCES "UrlGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Url" ("createdAt", "displayOrder", "iconPath", "id", "title", "updatedAt", "url", "urlGroupId") SELECT "createdAt", "displayOrder", "iconPath", "id", "title", "updatedAt", "url", "urlGroupId" FROM "Url";
DROP TABLE "Url";
ALTER TABLE "new_Url" RENAME TO "Url";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
