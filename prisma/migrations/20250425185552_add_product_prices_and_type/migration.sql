/*
  Warnings:

  - You are about to drop the column `price` on the `Product` table. All the data in the column will be lost.
  - Added the required column `priceBRL` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceCLP` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceUSD` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'general',
    "priceUSD" REAL NOT NULL DEFAULT 0,
    "priceCLP" REAL NOT NULL DEFAULT 0,
    "priceBRL" REAL NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Copiamos los datos existentes
INSERT INTO "new_Product" ("id", "name", "description", "type", "priceUSD", "priceCLP", "priceBRL", "stock", "imageUrl", "createdAt", "updatedAt")
SELECT 
    "id", 
    "name", 
    "description", 
    'general' as "type",
    "price" as "priceUSD",
    "price" * 1000 as "priceCLP",
    "price" * 5 as "priceBRL",
    "stock",
    "imageUrl",
    "createdAt",
    "updatedAt"
FROM "Product";

DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");
PRAGMA foreign_keys=ON;
