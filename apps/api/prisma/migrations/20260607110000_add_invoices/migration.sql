CREATE TABLE `invoices` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `invoice_number` VARCHAR(191) NOT NULL,
  `billing_cycle_id` INTEGER NOT NULL,
  `customer_id` INTEGER NOT NULL,
  `subscription_id` INTEGER NULL,
  `issue_date` DATE NOT NULL,
  `due_date` DATE NOT NULL,
  `subtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `total` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `amount_paid` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `balance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `status` ENUM('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'draft',
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  UNIQUE INDEX `invoices_invoice_number_key`(`invoice_number`),
  UNIQUE INDEX `invoices_billing_cycle_id_subscription_id_key`(`billing_cycle_id`, `subscription_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `invoice_items` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `invoice_id` INTEGER NOT NULL,
  `service_plan_id` INTEGER NULL,
  `item_type` ENUM('recurring_service', 'installation_fee', 'adjustment', 'other') NOT NULL DEFAULT 'recurring_service',
  `description` VARCHAR(191) NOT NULL,
  `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(10, 2) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_billing_cycle_id_fkey`
  FOREIGN KEY (`billing_cycle_id`) REFERENCES `billing_cycles`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_customer_id_fkey`
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_subscription_id_fkey`
  FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `invoice_items`
  ADD CONSTRAINT `invoice_items_invoice_id_fkey`
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `invoice_items`
  ADD CONSTRAINT `invoice_items_service_plan_id_fkey`
  FOREIGN KEY (`service_plan_id`) REFERENCES `service_plans`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
