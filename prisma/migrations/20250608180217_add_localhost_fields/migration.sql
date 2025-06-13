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
    "isLocalhost" BOOLEAN NOT NULL DEFAULT false,
    "port" TEXT,
    "path" TEXT,
    "localhostMobilePath" TEXT,
    "localhostMobilePort" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Url" ("createdAt", "iconPath", "id", "idleTimeoutMinutes", "title", "updatedAt", "url", "urlMobile") SELECT "createdAt", "iconPath", "id", "idleTimeoutMinutes", "title", "updatedAt", "url", "urlMobile" FROM "Url";
DROP TABLE "Url";
ALTER TABLE "new_Url" RENAME TO "Url";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
