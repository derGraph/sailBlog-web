-- CreateTable
CREATE TABLE "User" (
    "username" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "description" TEXT,
    "profilePictureId" TEXT,
    "dateOfBirth" DATETIME,
    "roleId" TEXT NOT NULL DEFAULT 'user',
    "activeTripId" TEXT NOT NULL,
    CONSTRAINT "User_profilePictureId_fkey" FOREIGN KEY ("profilePictureId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "User_activeTripId_fkey" FOREIGN KEY ("activeTripId") REFERENCES "Trip" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("username") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "Key" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "passwordHash" TEXT,
    "userId" TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL,
    CONSTRAINT "Key_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("username") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Voyage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start" DATETIME,
    "end" DATETIME,
    "public" BOOLEAN NOT NULL
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voyageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startPointId" TEXT,
    "endPointId" TEXT,
    "start" DATETIME,
    "end" DATETIME,
    "last_update" DATETIME NOT NULL,
    "length" DECIMAL,
    "skipperName" TEXT,
    CONSTRAINT "Trip_voyageId_fkey" FOREIGN KEY ("voyageId") REFERENCES "Voyage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trip_startPointId_fkey" FOREIGN KEY ("startPointId") REFERENCES "Datapoint" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Trip_endPointId_fkey" FOREIGN KEY ("endPointId") REFERENCES "Datapoint" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Trip_skipperName_fkey" FOREIGN KEY ("skipperName") REFERENCES "User" ("username") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Datapoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lat" DECIMAL NOT NULL,
    "long" DECIMAL NOT NULL,
    "speed" DECIMAL,
    "heading" DECIMAL,
    "depth" DECIMAL,
    "h_accuracy" DECIMAL,
    "v_accuracy" DECIMAL,
    "propulsion" INTEGER,
    CONSTRAINT "Datapoint_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visibility" INTEGER NOT NULL DEFAULT 1,
    "username" TEXT NOT NULL,
    CONSTRAINT "Media_username_fkey" FOREIGN KEY ("username") REFERENCES "User" ("username") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_crew" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_crew_A_fkey" FOREIGN KEY ("A") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_crew_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("username") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_profilePictureId_key" ON "User"("profilePictureId");

-- CreateIndex
CREATE UNIQUE INDEX "Key_id_key" ON "Key"("id");

-- CreateIndex
CREATE INDEX "Key_userId_idx" ON "Key"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_startPointId_key" ON "Trip"("startPointId");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_endPointId_key" ON "Trip"("endPointId");

-- CreateIndex
CREATE UNIQUE INDEX "_crew_AB_unique" ON "_crew"("A", "B");

-- CreateIndex
CREATE INDEX "_crew_B_index" ON "_crew"("B");
