ALTER TABLE `subscriptions` ADD COLUMN `label` VARCHAR(191) NULL;

CREATE TABLE `collector_remittances` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `remittance_number` VARCHAR(191) NOT NULL,
  `collector_user_id` INTEGER NOT NULL,
  `received_by_user_id` INTEGER NOT NULL,
  `period_start` DATE NOT NULL,
  `period_end` DATE NOT NULL,
  `expected_amount` DECIMAL(10, 2) NOT NULL,
  `cash_received_amount` DECIMAL(10, 2) NOT NULL,
  `variance` DECIMAL(10, 2) NOT NULL,
  `notes` TEXT NULL,
  `status` ENUM('recorded', 'voided') NOT NULL DEFAULT 'recorded',
  `remittance_date` DATE NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `collector_remittances_remittance_number_key`(`remittance_number`),
  INDEX `collector_remittances_collector_user_id_idx`(`collector_user_id`),
  INDEX `collector_remittances_remittance_date_idx`(`remittance_date`),
  INDEX `collector_remittances_status_idx`(`status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `collector_remittances_collector_user_id_fkey`
    FOREIGN KEY (`collector_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `collector_remittances_received_by_user_id_fkey`
    FOREIGN KEY (`received_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
