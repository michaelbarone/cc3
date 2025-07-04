-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'app-config',
    "appName" TEXT NOT NULL DEFAULT 'Control Center',
    "appLogo" TEXT,
    "favicon" TEXT,
    "loginTheme" TEXT NOT NULL DEFAULT 'dark',
    "registrationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "minPasswordLength" INTEGER NOT NULL DEFAULT 4,
    "requireUppercase" BOOLEAN NOT NULL DEFAULT false,
    "requireLowercase" BOOLEAN NOT NULL DEFAULT false,
    "requireNumbers" BOOLEAN NOT NULL DEFAULT false,
    "requireSpecialChars" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AppConfig" ("appLogo", "appName", "createdAt", "favicon", "id", "loginTheme", "registrationEnabled", "updatedAt") SELECT "appLogo", "appName", "createdAt", "favicon", "id", "loginTheme", "registrationEnabled", "updatedAt" FROM "AppConfig";
DROP TABLE "AppConfig";
ALTER TABLE "new_AppConfig" RENAME TO "AppConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
