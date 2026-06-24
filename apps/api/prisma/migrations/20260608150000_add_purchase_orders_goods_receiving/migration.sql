CREATE TABLE `purchase_orders` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `po_number` VARCHAR(191) NOT NULL,
  `supplier_id` INTEGER NOT NULL,
  `purchase_request_id` INTEGER NULL,
  `status` ENUM('draft', 'issued', 'partially_received', 'received', 'cancelled') NOT NULL DEFAULT 'draft',
  `order_date` DATE NOT NULL DEFAULT (CURRENT_DATE),
  `expected_date` DATE NULL,
  `payment_terms` VARCHAR(191) NULL,
  `delivery_address` TEXT NULL,
  `notes` TEXT NULL,
  `issued_by` VARCHAR(191) NULL,
  `issued_at` DATETIME(3) NULL,
  `cancelled_reason` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  UNIQUE INDEX `purchase_orders_po_number_key`(`po_number`),
  INDEX `purchase_orders_supplier_id_idx`(`supplier_id`),
  INDEX `purchase_orders_purchase_request_id_idx`(`purchase_request_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `purchase_order_items` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `purchase_order_id` INTEGER NOT NULL,
  `item_id` INTEGER NOT NULL,
  `description` VARCHAR(191) NULL,
  `quantity` DECIMAL(12, 2) NOT NULL,
  `unit_cost` DECIMAL(12, 2) NOT NULL,
  `received_quantity` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `purchase_order_items_purchase_order_id_idx`(`purchase_order_id`),
  INDEX `purchase_order_items_item_id_idx`(`item_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `goods_receipts` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `receipt_number` VARCHAR(191) NOT NULL,
  `purchase_order_id` INTEGER NOT NULL,
  `supplier_id` INTEGER NOT NULL,
  `warehouse_id` INTEGER NOT NULL,
  `status` ENUM('received', 'cancelled') NOT NULL DEFAULT 'received',
  `received_date` DATE NOT NULL DEFAULT (CURRENT_DATE),
  `received_by` VARCHAR(191) NULL,
  `delivery_receipt_no` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  UNIQUE INDEX `goods_receipts_receipt_number_key`(`receipt_number`),
  INDEX `goods_receipts_purchase_order_id_idx`(`purchase_order_id`),
  INDEX `goods_receipts_supplier_id_idx`(`supplier_id`),
  INDEX `goods_receipts_warehouse_id_idx`(`warehouse_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `goods_receipt_items` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `goods_receipt_id` INTEGER NOT NULL,
  `purchase_order_item_id` INTEGER NOT NULL,
  `item_id` INTEGER NOT NULL,
  `quantity_received` DECIMAL(12, 2) NOT NULL,
  `unit_cost` DECIMAL(12, 2) NOT NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `goods_receipt_items_goods_receipt_id_idx`(`goods_receipt_id`),
  INDEX `goods_receipt_items_purchase_order_item_id_idx`(`purchase_order_item_id`),
  INDEX `goods_receipt_items_item_id_idx`(`item_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_purchase_request_id_fkey` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_purchase_order_id_fkey` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `goods_receipts` ADD CONSTRAINT `goods_receipts_purchase_order_id_fkey` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `goods_receipts` ADD CONSTRAINT `goods_receipts_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `goods_receipts` ADD CONSTRAINT `goods_receipts_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `goods_receipt_items` ADD CONSTRAINT `goods_receipt_items_goods_receipt_id_fkey` FOREIGN KEY (`goods_receipt_id`) REFERENCES `goods_receipts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `goods_receipt_items` ADD CONSTRAINT `goods_receipt_items_purchase_order_item_id_fkey` FOREIGN KEY (`purchase_order_item_id`) REFERENCES `purchase_order_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `goods_receipt_items` ADD CONSTRAINT `goods_receipt_items_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
