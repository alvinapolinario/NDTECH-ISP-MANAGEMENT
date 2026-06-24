-- AlterTable
ALTER TABLE `service_plans` ADD COLUMN `pppoe_profile_name` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `pppoe_accounts` ADD COLUMN `active_profile_name` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `pppoe_account_action_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pppoe_account_id` INTEGER NOT NULL,
    `customer_id` INTEGER NULL,
    `router_id` INTEGER NOT NULL,
    `action` ENUM('enable', 'disable', 'suspend', 'restore', 'profile_change') NOT NULL,
    `trigger_source` VARCHAR(191) NOT NULL DEFAULT 'manual',
    `previous_status` ENUM('active', 'suspended', 'disabled') NULL,
    `new_status` ENUM('active', 'suspended', 'disabled') NULL,
    `previous_profile` VARCHAR(191) NULL,
    `new_profile` VARCHAR(191) NULL,
    `performed_by_user_id` INTEGER NULL,
    `invoice_id` INTEGER NULL,
    `payment_id` INTEGER NULL,
    `mikrotik_message` TEXT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pppoe_account_action_logs_pppoe_account_id_idx`(`pppoe_account_id`),
    INDEX `pppoe_account_action_logs_customer_id_idx`(`customer_id`),
    INDEX `pppoe_account_action_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pppoe_account_action_logs` ADD CONSTRAINT `pppoe_account_action_logs_pppoe_account_id_fkey` FOREIGN KEY (`pppoe_account_id`) REFERENCES `pppoe_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pppoe_account_action_logs` ADD CONSTRAINT `pppoe_account_action_logs_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pppoe_account_action_logs` ADD CONSTRAINT `pppoe_account_action_logs_router_id_fkey` FOREIGN KEY (`router_id`) REFERENCES `mikrotik_routers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pppoe_account_action_logs` ADD CONSTRAINT `pppoe_account_action_logs_performed_by_user_id_fkey` FOREIGN KEY (`performed_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pppoe_account_action_logs` ADD CONSTRAINT `pppoe_account_action_logs_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pppoe_account_action_logs` ADD CONSTRAINT `pppoe_account_action_logs_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
