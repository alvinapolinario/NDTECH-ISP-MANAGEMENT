CREATE TABLE `projects` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `project_type` ENUM('expansion', 'backbone', 'customer_install', 'maintenance', 'other') NOT NULL DEFAULT 'expansion',
  `status` ENUM('planning', 'active', 'on_hold', 'completed', 'cancelled') NOT NULL DEFAULT 'planning',
  `customer_id` INTEGER NULL,
  `location` TEXT NULL,
  `start_date` DATE NULL,
  `target_date` DATE NULL,
  `completed_at` DATETIME(3) NULL,
  `budget` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `manager_name` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  UNIQUE INDEX `projects_code_key`(`code`),
  INDEX `projects_customer_id_idx`(`customer_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `project_estimates` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `project_id` INTEGER NOT NULL,
  `estimate_number` VARCHAR(191) NOT NULL,
  `status` ENUM('draft', 'approved', 'rejected', 'expired') NOT NULL DEFAULT 'draft',
  `valid_until` DATE NULL,
  `labor_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `overhead_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  UNIQUE INDEX `project_estimates_estimate_number_key`(`estimate_number`),
  INDEX `project_estimates_project_id_idx`(`project_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `project_estimate_items` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `estimate_id` INTEGER NOT NULL,
  `item_id` INTEGER NULL,
  `description` VARCHAR(191) NOT NULL,
  `quantity` DECIMAL(12, 2) NOT NULL,
  `unit` VARCHAR(191) NOT NULL DEFAULT 'pcs',
  `unit_cost` DECIMAL(12, 2) NOT NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `project_estimate_items_estimate_id_idx`(`estimate_id`),
  INDEX `project_estimate_items_item_id_idx`(`item_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `project_boms` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `project_id` INTEGER NOT NULL,
  `bom_number` VARCHAR(191) NOT NULL,
  `status` ENUM('draft', 'approved', 'issued', 'cancelled') NOT NULL DEFAULT 'draft',
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  UNIQUE INDEX `project_boms_bom_number_key`(`bom_number`),
  INDEX `project_boms_project_id_idx`(`project_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `project_bom_items` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `bom_id` INTEGER NOT NULL,
  `item_id` INTEGER NOT NULL,
  `quantity` DECIMAL(12, 2) NOT NULL,
  `estimated_unit_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `project_bom_items_bom_id_idx`(`bom_id`),
  INDEX `project_bom_items_item_id_idx`(`item_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `project_material_usages` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `project_id` INTEGER NOT NULL,
  `warehouse_id` INTEGER NOT NULL,
  `usage_number` VARCHAR(191) NOT NULL,
  `used_date` DATE NOT NULL DEFAULT (CURRENT_DATE),
  `used_by` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  UNIQUE INDEX `project_material_usages_usage_number_key`(`usage_number`),
  INDEX `project_material_usages_project_id_idx`(`project_id`),
  INDEX `project_material_usages_warehouse_id_idx`(`warehouse_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `project_material_usage_items` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `material_usage_id` INTEGER NOT NULL,
  `item_id` INTEGER NOT NULL,
  `quantity` DECIMAL(12, 2) NOT NULL,
  `unit_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `project_material_usage_items_material_usage_id_idx`(`material_usage_id`),
  INDEX `project_material_usage_items_item_id_idx`(`item_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `project_costings` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `project_id` INTEGER NOT NULL,
  `status` ENUM('draft', 'final') NOT NULL DEFAULT 'draft',
  `labor_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `overhead_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `other_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  UNIQUE INDEX `project_costings_project_id_key`(`project_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `projects` ADD CONSTRAINT `projects_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `project_estimates` ADD CONSTRAINT `project_estimates_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `project_estimate_items` ADD CONSTRAINT `project_estimate_items_estimate_id_fkey` FOREIGN KEY (`estimate_id`) REFERENCES `project_estimates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `project_estimate_items` ADD CONSTRAINT `project_estimate_items_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `project_boms` ADD CONSTRAINT `project_boms_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `project_bom_items` ADD CONSTRAINT `project_bom_items_bom_id_fkey` FOREIGN KEY (`bom_id`) REFERENCES `project_boms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `project_bom_items` ADD CONSTRAINT `project_bom_items_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `project_material_usages` ADD CONSTRAINT `project_material_usages_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `project_material_usages` ADD CONSTRAINT `project_material_usages_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `project_material_usage_items` ADD CONSTRAINT `project_material_usage_items_material_usage_id_fkey` FOREIGN KEY (`material_usage_id`) REFERENCES `project_material_usages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `project_material_usage_items` ADD CONSTRAINT `project_material_usage_items_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `project_costings` ADD CONSTRAINT `project_costings_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
