CREATE TABLE `collection_cases` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `invoice_id` INTEGER NOT NULL,
  `customer_id` INTEGER NOT NULL,
  `status` ENUM('pending', 'contacted', 'promised_to_pay', 'escalated', 'resolved', 'cancelled') NOT NULL DEFAULT 'pending',
  `priority` ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
  `assigned_collector` VARCHAR(191) NULL,
  `last_contacted_at` DATETIME(3) NULL,
  `next_follow_up_date` DATE NULL,
  `promise_to_pay_date` DATE NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  UNIQUE INDEX `collection_cases_invoice_id_key`(`invoice_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `collection_cases`
  ADD CONSTRAINT `collection_cases_invoice_id_fkey`
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `collection_cases`
  ADD CONSTRAINT `collection_cases_customer_id_fkey`
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
