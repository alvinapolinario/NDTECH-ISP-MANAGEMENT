CREATE TABLE `purchase_requests` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `request_number` VARCHAR(191) NOT NULL,
  `supplier_id` INTEGER NULL,
  `status` ENUM('draft', 'submitted', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'draft',
  `priority` ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
  `requested_by` VARCHAR(191) NULL,
  `needed_date` DATE NULL,
  `purpose` TEXT NULL,
  `notes` TEXT NULL,
  `approved_by` VARCHAR(191) NULL,
  `approved_at` DATETIME(3) NULL,
  `rejected_reason` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  UNIQUE INDEX `purchase_requests_request_number_key`(`request_number`),
  INDEX `purchase_requests_supplier_id_idx`(`supplier_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `purchase_request_items` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `purchase_request_id` INTEGER NOT NULL,
  `item_id` INTEGER NOT NULL,
  `description` VARCHAR(191) NULL,
  `quantity` DECIMAL(12, 2) NOT NULL,
  `estimated_unit_cost` DECIMAL(12, 2) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `purchase_request_items_purchase_request_id_idx`(`purchase_request_id`),
  INDEX `purchase_request_items_item_id_idx`(`item_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `purchase_requests`
  ADD CONSTRAINT `purchase_requests_supplier_id_fkey`
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `purchase_request_items`
  ADD CONSTRAINT `purchase_request_items_purchase_request_id_fkey`
  FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `purchase_request_items`
  ADD CONSTRAINT `purchase_request_items_item_id_fkey`
  FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
