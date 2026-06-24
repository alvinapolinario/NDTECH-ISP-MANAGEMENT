-- CreateTable
CREATE TABLE `collector_mobile_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `local_id` VARCHAR(191) NOT NULL,
    `collector_user_id` INTEGER NOT NULL,
    `device_id` VARCHAR(191) NOT NULL,
    `event_type` ENUM('payment', 'collection_update', 'visit_note') NOT NULL,
    `event_payload` JSON NOT NULL,
    `result_status` ENUM('accepted', 'rejected', 'duplicate', 'adjusted') NOT NULL,
    `result_message` TEXT NULL,
    `payment_id` INTEGER NULL,
    `collection_case_id` INTEGER NULL,
    `processed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `collector_mobile_events_local_id_key`(`local_id`),
    INDEX `collector_mobile_events_collector_user_id_processed_at_idx`(`collector_user_id`, `processed_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `collector_mobile_events` ADD CONSTRAINT `collector_mobile_events_collector_user_id_fkey` FOREIGN KEY (`collector_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collector_mobile_events` ADD CONSTRAINT `collector_mobile_events_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collector_mobile_events` ADD CONSTRAINT `collector_mobile_events_collection_case_id_fkey` FOREIGN KEY (`collection_case_id`) REFERENCES `collection_cases`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
