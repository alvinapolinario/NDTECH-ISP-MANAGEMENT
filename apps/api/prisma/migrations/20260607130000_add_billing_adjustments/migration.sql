CREATE TABLE `billing_adjustments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `adjustment_number` VARCHAR(191) NOT NULL,
  `invoice_id` INTEGER NOT NULL,
  `customer_id` INTEGER NOT NULL,
  `adjustment_type` ENUM('credit', 'charge') NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `reason` VARCHAR(191) NOT NULL,
  `adjustment_date` DATE NOT NULL,
  `status` ENUM('posted', 'voided') NOT NULL DEFAULT 'posted',
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  UNIQUE INDEX `billing_adjustments_adjustment_number_key`(`adjustment_number`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `billing_adjustments`
  ADD CONSTRAINT `billing_adjustments_invoice_id_fkey`
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `billing_adjustments`
  ADD CONSTRAINT `billing_adjustments_customer_id_fkey`
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
