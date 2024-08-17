-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "username" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "description" TEXT,
    "profilePictureId" TEXT,
    "dateOfBirth" DATETIME,
    "roleId" TEXT NOT NULL DEFAULT 'user',
    "activeTripId" TEXT NOT NULL,
    "lastPing" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_profilePictureId_fkey" FOREIGN KEY ("profilePictureId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "User_activeTripId_fkey" FOREIGN KEY ("activeTripId") REFERENCES "Trip" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("activeTripId", "dateOfBirth", "description", "email", "firstName", "lastName", "lastPing", "profilePictureId", "roleId", "username") SELECT "activeTripId", "dateOfBirth", "description", "email", "firstName", "lastName", coalesce("lastPing", CURRENT_TIMESTAMP) AS "lastPing", "profilePictureId", "roleId", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_profilePictureId_key" ON "User"("profilePictureId");
PRAGMA foreign_key_check("User");
PRAGMA foreign_keys=ON;
