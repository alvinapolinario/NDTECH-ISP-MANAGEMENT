CREATE TABLE `ticket_categories` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  UNIQUE INDEX `ticket_categories_code_key`(`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `tickets` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `ticket_number` VARCHAR(191) NOT NULL,
  `customer_id` INTEGER NULL,
  `subscription_id` INTEGER NULL,
  `category_id` INTEGER NOT NULL,
  `subject` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `status` ENUM('open', 'assigned', 'in_progress', 'resolved', 'closed', 'cancelled') NOT NULL DEFAULT 'open',
  `priority` ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
  `reported_by` VARCHAR(191) NULL,
  `contact_number` VARCHAR(191) NULL,
  `location` TEXT NULL,
  `due_at` DATETIME(3) NULL,
  `resolved_at` DATETIME(3) NULL,
  `resolution` TEXT NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  UNIQUE INDEX `tickets_ticket_number_key`(`ticket_number`),
  INDEX `tickets_customer_id_idx`(`customer_id`),
  INDEX `tickets_subscription_id_idx`(`subscription_id`),
  INDEX `tickets_category_id_idx`(`category_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `technician_assignments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `ticket_id` INTEGER NOT NULL,
  `technician_id` INTEGER NOT NULL,
  `status` ENUM('assigned', 'accepted', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'assigned',
  `scheduled_at` DATETIME(3) NULL,
  `started_at` DATETIME(3) NULL,
  `completed_at` DATETIME(3) NULL,
  `notes` TEXT NULL,
  `completion_notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  INDEX `technician_assignments_ticket_id_idx`(`ticket_id`),
  INDEX `technician_assignments_technician_id_idx`(`technician_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `tickets` ADD CONSTRAINT `tickets_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_subscription_id_fkey` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `ticket_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `technician_assignments` ADD CONSTRAINT `technician_assignments_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `technician_assignments` ADD CONSTRAINT `technician_assignments_technician_id_fkey` FOREIGN KEY (`technician_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
