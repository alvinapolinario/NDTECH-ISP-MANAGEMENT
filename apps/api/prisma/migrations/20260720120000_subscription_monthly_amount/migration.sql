-- Optional negotiated monthly fee per subscription (null = use service plan catalog price).
ALTER TABLE `subscriptions` ADD COLUMN `monthly_amount` DECIMAL(10, 2) NULL;
