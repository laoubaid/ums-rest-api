/*
  Warnings:

  - You are about to drop the column `used` on the `TwoFactorCode` table. All the data in the column will be lost.
  - You are about to drop the column `enabled` on the `UserTwoFactor` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TwoFactorCode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TwoFactorCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TwoFactorCode" ("code", "createdAt", "expiresAt", "id", "userId") SELECT "code", "createdAt", "expiresAt", "id", "userId" FROM "TwoFactorCode";
DROP TABLE "TwoFactorCode";
ALTER TABLE "new_TwoFactorCode" RENAME TO "TwoFactorCode";
CREATE TABLE "new_UserTwoFactor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "method" TEXT,
    "totpSecret" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserTwoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserTwoFactor" ("createdAt", "id", "method", "totpSecret", "updatedAt", "userId") SELECT "createdAt", "id", "method", "totpSecret", "updatedAt", "userId" FROM "UserTwoFactor";
DROP TABLE "UserTwoFactor";
ALTER TABLE "new_UserTwoFactor" RENAME TO "UserTwoFactor";
CREATE UNIQUE INDEX "UserTwoFactor_userId_key" ON "UserTwoFactor"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
