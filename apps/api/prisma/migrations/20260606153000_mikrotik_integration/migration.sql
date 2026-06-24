-- CreateTable
CREATE TABLE `mikrotik_routers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `host` VARCHAR(191) NOT NULL,
    `api_port` INTEGER NOT NULL DEFAULT 8728,
    `username` VARCHAR(191) NOT NULL,
    `password_encrypted` TEXT NOT NULL,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `last_connection_check_at` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pppoe_accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `service_plan_id` INTEGER NOT NULL,
    `router_id` INTEGER NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password_encrypted` TEXT NOT NULL,
    `profile_name` VARCHAR(191) NOT NULL,
    `remote_address` VARCHAR(191) NULL,
    `status` ENUM('active', 'suspended', 'disabled') NOT NULL DEFAULT 'active',
    `last_synced_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pppoe_accounts_router_id_username_key`(`router_id`, `username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pppoe_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pppoe_account_id` INTEGER NOT NULL,
    `router_id` INTEGER NOT NULL,
    `ip_address` VARCHAR(191) NULL,
    `mac_address` VARCHAR(191) NULL,
    `uptime` VARCHAR(191) NULL,
    `rx_bytes` BIGINT NOT NULL DEFAULT 0,
    `tx_bytes` BIGINT NOT NULL DEFAULT 0,
    `status` ENUM('online', 'offline') NOT NULL DEFAULT 'offline',
    `checked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mikrotik_command_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `router_id` INTEGER NOT NULL,
    `command_type` VARCHAR(191) NOT NULL,
    `command_payload` JSON NULL,
    `status` ENUM('mock_logged', 'executed', 'failed', 'skipped') NOT NULL DEFAULT 'mock_logged',
    `response_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pppoe_accounts` ADD CONSTRAINT `pppoe_accounts_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pppoe_accounts` ADD CONSTRAINT `pppoe_accounts_service_plan_id_fkey` FOREIGN KEY (`service_plan_id`) REFERENCES `service_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pppoe_accounts` ADD CONSTRAINT `pppoe_accounts_router_id_fkey` FOREIGN KEY (`router_id`) REFERENCES `mikrotik_routers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pppoe_sessions` ADD CONSTRAINT `pppoe_sessions_pppoe_account_id_fkey` FOREIGN KEY (`pppoe_account_id`) REFERENCES `pppoe_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pppoe_sessions` ADD CONSTRAINT `pppoe_sessions_router_id_fkey` FOREIGN KEY (`router_id`) REFERENCES `mikrotik_routers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mikrotik_command_logs` ADD CONSTRAINT `mikrotik_command_logs_router_id_fkey` FOREIGN KEY (`router_id`) REFERENCES `mikrotik_routers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_pppoe_account_id_fkey` FOREIGN KEY (`pppoe_account_id`) REFERENCES `pppoe_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
