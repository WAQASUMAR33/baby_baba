-- Migration: Add employee tracking to Sales table
-- Date: 2026-01-19

-- Add employeeId column
ALTER TABLE `Sale` 
ADD COLUMN `employeeId` INT NULL AFTER `commission`;

-- Add employeeName column
ALTER TABLE `Sale` 
ADD COLUMN `employeeName` VARCHAR(255) NULL AFTER `employeeId`;

-- Add index on employeeId for faster queries
ALTER TABLE `Sale` 
ADD INDEX `Sale_employeeId_idx` (`employeeId`);

-- Drop customerPhone column (no longer used in POS)
ALTER TABLE `Sale` 
DROP COLUMN `customerPhone`;
