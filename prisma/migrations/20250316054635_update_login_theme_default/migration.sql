-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'app-config',
    "appName" TEXT NOT NULL DEFAULT 'URL Dashboard',
    "appLogo" TEXT,
    "loginTheme" TEXT NOT NULL DEFAULT 'dark',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AppConfig" ("appLogo", "appName", "createdAt", "id", "updatedAt") SELECT "appLogo", "appName", "createdAt", "id", "updatedAt" FROM "AppConfig";
DROP TABLE "AppConfig";
ALTER TABLE "new_AppConfig" RENAME TO "AppConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
