CREATE TABLE `inventory_items` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `category_id` INTEGER NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `item_type` ENUM('material', 'equipment', 'consumable', 'tool') NOT NULL DEFAULT 'material',
  `unit` VARCHAR(191) NOT NULL DEFAULT 'pcs',
  `unit_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `reorder_level` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  UNIQUE INDEX `inventory_items_code_key`(`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `inventory_stocks` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `item_id` INTEGER NOT NULL,
  `warehouse_id` INTEGER NOT NULL,
  `quantity` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `inventory_stocks_item_id_warehouse_id_key`(`item_id`, `warehouse_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `inventory_movements` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `item_id` INTEGER NOT NULL,
  `warehouse_id` INTEGER NOT NULL,
  `to_warehouse_id` INTEGER NULL,
  `movement_type` ENUM('stock_in', 'stock_out', 'transfer', 'return') NOT NULL,
  `quantity` DECIMAL(12, 2) NOT NULL,
  `unit_cost` DECIMAL(12, 2) NULL,
  `reference_type` VARCHAR(191) NULL,
  `reference_no` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `inventory_movements_item_id_created_at_idx`(`item_id`, `created_at`),
  INDEX `inventory_movements_warehouse_id_created_at_idx`(`warehouse_id`, `created_at`),
  INDEX `inventory_movements_to_warehouse_id_idx`(`to_warehouse_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `inventory_adjustments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `item_id` INTEGER NOT NULL,
  `warehouse_id` INTEGER NOT NULL,
  `adjustment_type` ENUM('increase', 'decrease', 'set') NOT NULL,
  `quantity` DECIMAL(12, 2) NOT NULL,
  `previous_quantity` DECIMAL(12, 2) NOT NULL,
  `new_quantity` DECIMAL(12, 2) NOT NULL,
  `reason` VARCHAR(191) NOT NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `inventory_adjustments_item_id_created_at_idx`(`item_id`, `created_at`),
  INDEX `inventory_adjustments_warehouse_id_created_at_idx`(`warehouse_id`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `inventory_items`
  ADD CONSTRAINT `inventory_items_category_id_fkey`
  FOREIGN KEY (`category_id`) REFERENCES `inventory_categories`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `inventory_stocks`
  ADD CONSTRAINT `inventory_stocks_item_id_fkey`
  FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `inventory_stocks`
  ADD CONSTRAINT `inventory_stocks_warehouse_id_fkey`
  FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `inventory_movements`
  ADD CONSTRAINT `inventory_movements_item_id_fkey`
  FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `inventory_movements`
  ADD CONSTRAINT `inventory_movements_warehouse_id_fkey`
  FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `inventory_movements`
  ADD CONSTRAINT `inventory_movements_to_warehouse_id_fkey`
  FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouses`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `inventory_adjustments`
  ADD CONSTRAINT `inventory_adjustments_item_id_fkey`
  FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `inventory_adjustments`
  ADD CONSTRAINT `inventory_adjustments_warehouse_id_fkey`
  FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
