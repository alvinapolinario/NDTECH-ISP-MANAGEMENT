CREATE TABLE `sms_messages` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `recipient` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `sender_name` VARCHAR(191) NULL,
  `status` ENUM('queued', 'sent', 'failed', 'skipped') NOT NULL DEFAULT 'queued',
  `semaphore_message_id` VARCHAR(191) NULL,
  `semaphore_status` VARCHAR(191) NULL,
  `network` VARCHAR(191) NULL,
  `error_message` TEXT NULL,
  `customer_id` INTEGER NULL,
  `sent_by_user_id` INTEGER NULL,
  `notification_type` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `sms_messages_customer_id_idx`(`customer_id`),
  INDEX `sms_messages_status_idx`(`status`),
  INDEX `sms_messages_created_at_idx`(`created_at`),
  CONSTRAINT `sms_messages_customer_id_fkey`
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sms_messages_sent_by_user_id_fkey`
    FOREIGN KEY (`sent_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
