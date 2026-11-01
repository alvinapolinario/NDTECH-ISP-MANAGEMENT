-- CreateTable
CREATE TABLE `payment_gateway_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `provider` ENUM('paymongo', 'stripe', 'gcash', 'maya') NOT NULL,
    `external_id` VARCHAR(191) NOT NULL,
    `idempotency_key` VARCHAR(191) NULL,
    `invoice_id` INTEGER NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'PHP',
    `status` ENUM('pending', 'paid', 'failed', 'expired', 'cancelled') NOT NULL DEFAULT 'pending',
    `checkout_url` TEXT NULL,
    `payment_id` INTEGER NULL,
    `channel` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `webhook_events` JSON NULL,
    `expires_at` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payment_gateway_transactions_idempotency_key_key`(`idempotency_key`),
    UNIQUE INDEX `payment_gateway_transactions_payment_id_key`(`payment_id`),
    UNIQUE INDEX `payment_gateway_transactions_provider_external_id_key`(`provider`, `external_id`),
    INDEX `payment_gateway_transactions_invoice_id_idx`(`invoice_id`),
    INDEX `payment_gateway_transactions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `payment_gateway_transactions` ADD CONSTRAINT `payment_gateway_transactions_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_gateway_transactions` ADD CONSTRAINT `payment_gateway_transactions_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_gateway_transactions` ADD CONSTRAINT `payment_gateway_transactions_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
