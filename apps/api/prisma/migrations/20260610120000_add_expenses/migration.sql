-- CreateTable
CREATE TABLE `expense_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `expense_categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expenses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `expense_number` VARCHAR(191) NOT NULL,
    `expense_category_id` INTEGER NOT NULL,
    `supplier_id` INTEGER NULL,
    `expense_date` DATE NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `payee` VARCHAR(191) NOT NULL,
    `payment_method` ENUM('cash', 'gcash', 'bank_transfer', 'check', 'card', 'other') NOT NULL,
    `reference_number` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `notes` TEXT NULL,
    `status` ENUM('recorded', 'voided') NOT NULL DEFAULT 'recorded',
    `recorded_by_user_id` INTEGER NULL,
    `assigned_finance_user_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `expenses_expense_number_key`(`expense_number`),
    INDEX `expenses_expense_category_id_idx`(`expense_category_id`),
    INDEX `expenses_supplier_id_idx`(`supplier_id`),
    INDEX `expenses_expense_date_idx`(`expense_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_expense_category_id_fkey` FOREIGN KEY (`expense_category_id`) REFERENCES `expense_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_recorded_by_user_id_fkey` FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_assigned_finance_user_id_fkey` FOREIGN KEY (`assigned_finance_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
