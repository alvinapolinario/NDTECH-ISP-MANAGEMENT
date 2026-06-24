CREATE TABLE `network_alerts` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `target_id` INTEGER NULL,
  `check_id` INTEGER NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `severity` ENUM('info', 'warning', 'critical') NOT NULL DEFAULT 'warning',
  `status` ENUM('open', 'acknowledged', 'resolved', 'dismissed') NOT NULL DEFAULT 'open',
  `source` ENUM('monitoring', 'manual', 'system') NOT NULL DEFAULT 'manual',
  `metric` VARCHAR(191) NULL,
  `threshold` VARCHAR(191) NULL,
  `observed_value` VARCHAR(191) NULL,
  `assigned_to` VARCHAR(191) NULL,
  `acknowledged_by` VARCHAR(191) NULL,
  `acknowledged_at` DATETIME(3) NULL,
  `resolved_by` VARCHAR(191) NULL,
  `resolved_at` DATETIME(3) NULL,
  `resolution` TEXT NULL,
  `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  INDEX `network_alerts_status_severity_idx`(`status`, `severity`),
  INDEX `network_alerts_target_id_occurred_at_idx`(`target_id`, `occurred_at`),
  INDEX `network_alerts_check_id_idx`(`check_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `network_alerts`
  ADD CONSTRAINT `network_alerts_target_id_fkey`
  FOREIGN KEY (`target_id`) REFERENCES `network_monitoring_targets`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `network_alerts`
  ADD CONSTRAINT `network_alerts_check_id_fkey`
  FOREIGN KEY (`check_id`) REFERENCES `network_monitoring_checks`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
