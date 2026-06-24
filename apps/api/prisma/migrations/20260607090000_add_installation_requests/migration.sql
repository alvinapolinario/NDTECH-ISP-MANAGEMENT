CREATE TABLE `installation_requests` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `customer_id` INTEGER NOT NULL,
  `service_plan_id` INTEGER NULL,
  `status` ENUM('pending', 'scheduled', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  `priority` ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
  `requested_date` DATE NOT NULL DEFAULT (CURRENT_DATE),
  `scheduled_date` DATETIME(3) NULL,
  `completed_at` DATETIME(3) NULL,
  `assigned_installer_name` VARCHAR(191) NULL,
  `contact_number` VARCHAR(191) NULL,
  `installation_address` TEXT NOT NULL,
  `map_location` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `installation_requests`
  ADD CONSTRAINT `installation_requests_customer_id_fkey`
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `installation_requests`
  ADD CONSTRAINT `installation_requests_service_plan_id_fkey`
  FOREIGN KEY (`service_plan_id`) REFERENCES `service_plans`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
