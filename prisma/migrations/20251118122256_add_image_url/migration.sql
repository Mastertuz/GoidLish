/*
  Warnings:

  - You are about to drop the column `audioUrl` on the `words` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `words` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_words" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "english" TEXT NOT NULL,
    "russian" TEXT NOT NULL,
    "definition" TEXT,
    "example" TEXT,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dictionaryId" TEXT NOT NULL,
    CONSTRAINT "words_dictionaryId_fkey" FOREIGN KEY ("dictionaryId") REFERENCES "dictionaries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_words" ("createdAt", "definition", "dictionaryId", "english", "example", "id", "imageUrl", "russian") SELECT "createdAt", "definition", "dictionaryId", "english", "example", "id", "imageUrl", "russian" FROM "words";
DROP TABLE "words";
ALTER TABLE "new_words" RENAME TO "words";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
