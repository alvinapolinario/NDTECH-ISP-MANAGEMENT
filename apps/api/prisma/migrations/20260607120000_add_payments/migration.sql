CREATE TABLE `payments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `payment_number` VARCHAR(191) NOT NULL,
  `invoice_id` INTEGER NOT NULL,
  `customer_id` INTEGER NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `payment_date` DATE NOT NULL,
  `payment_method` ENUM('cash', 'gcash', 'bank_transfer', 'check', 'card', 'other') NOT NULL,
  `reference_number` VARCHAR(191) NULL,
  `received_by` VARCHAR(191) NULL,
  `status` ENUM('posted', 'voided') NOT NULL DEFAULT 'posted',
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  UNIQUE INDEX `payments_payment_number_key`(`payment_number`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `payments`
  ADD CONSTRAINT `payments_invoice_id_fkey`
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `payments`
  ADD CONSTRAINT `payments_customer_id_fkey`
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
