-- CreateTable
CREATE TABLE `subscriptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `service_plan_id` INTEGER NOT NULL,
    `pppoe_account_id` INTEGER NULL,
    `billing_day` INTEGER NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `status` ENUM('active', 'suspended', 'cancelled', 'terminated') NOT NULL DEFAULT 'active',
    `auto_suspend_enabled` BOOLEAN NOT NULL DEFAULT true,
    `grace_period_days` INTEGER NOT NULL DEFAULT 7,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_service_plan_id_fkey` FOREIGN KEY (`service_plan_id`) REFERENCES `service_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
