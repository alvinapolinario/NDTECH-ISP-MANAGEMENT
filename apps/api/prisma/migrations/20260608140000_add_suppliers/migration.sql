CREATE TABLE `suppliers` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `contact_person` VARCHAR(191) NULL,
  `contact_number` VARCHAR(191) NULL,
  `email` VARCHAR(191) NULL,
  `address` TEXT NULL,
  `tin` VARCHAR(191) NULL,
  `payment_terms` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  UNIQUE INDEX `suppliers_code_key`(`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
