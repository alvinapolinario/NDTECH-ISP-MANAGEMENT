-- Add customer birth date for birthday billing promos.
ALTER TABLE `customers` ADD COLUMN `birth_date` DATE NULL AFTER `mobile_number`;
