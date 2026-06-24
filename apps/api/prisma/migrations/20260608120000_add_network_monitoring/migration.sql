CREATE TABLE `network_monitoring_targets` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `device_type` ENUM('mikrotik_router', 'olt_device', 'onu_device', 'other') NOT NULL DEFAULT 'other',
  `monitor_method` ENUM('icmp', 'snmp', 'manual') NOT NULL DEFAULT 'icmp',
  `host` VARCHAR(191) NOT NULL,
  `mikrotik_router_id` INTEGER NULL,
  `olt_device_id` INTEGER NULL,
  `onu_device_id` INTEGER NULL,
  `snmp_community` VARCHAR(191) NULL,
  `status` ENUM('online', 'degraded', 'offline', 'unknown') NOT NULL DEFAULT 'unknown',
  `latency_ms` DECIMAL(8, 2) NULL,
  `packet_loss_percent` DECIMAL(5, 2) NULL,
  `uptime_seconds` INTEGER NULL,
  `cpu_usage_percent` DECIMAL(5, 2) NULL,
  `memory_usage_percent` DECIMAL(5, 2) NULL,
  `interface_status` VARCHAR(191) NULL,
  `interface_errors` INTEGER NULL DEFAULT 0,
  `last_checked_at` DATETIME(3) NULL,
  `location` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  UNIQUE INDEX `network_monitoring_targets_device_type_host_key`(`device_type`, `host`),
  INDEX `network_monitoring_targets_mikrotik_router_id_idx`(`mikrotik_router_id`),
  INDEX `network_monitoring_targets_olt_device_id_idx`(`olt_device_id`),
  INDEX `network_monitoring_targets_onu_device_id_idx`(`onu_device_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `network_monitoring_checks` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `target_id` INTEGER NOT NULL,
  `status` ENUM('online', 'degraded', 'offline', 'unknown') NOT NULL,
  `latency_ms` DECIMAL(8, 2) NULL,
  `packet_loss_percent` DECIMAL(5, 2) NULL,
  `uptime_seconds` INTEGER NULL,
  `cpu_usage_percent` DECIMAL(5, 2) NULL,
  `memory_usage_percent` DECIMAL(5, 2) NULL,
  `interface_status` VARCHAR(191) NULL,
  `interface_errors` INTEGER NULL DEFAULT 0,
  `checked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `notes` TEXT NULL,

  INDEX `network_monitoring_checks_target_id_checked_at_idx`(`target_id`, `checked_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `network_monitoring_targets`
  ADD CONSTRAINT `network_monitoring_targets_mikrotik_router_id_fkey`
  FOREIGN KEY (`mikrotik_router_id`) REFERENCES `mikrotik_routers`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `network_monitoring_targets`
  ADD CONSTRAINT `network_monitoring_targets_olt_device_id_fkey`
  FOREIGN KEY (`olt_device_id`) REFERENCES `olt_devices`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `network_monitoring_targets`
  ADD CONSTRAINT `network_monitoring_targets_onu_device_id_fkey`
  FOREIGN KEY (`onu_device_id`) REFERENCES `onu_devices`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `network_monitoring_checks`
  ADD CONSTRAINT `network_monitoring_checks_target_id_fkey`
  FOREIGN KEY (`target_id`) REFERENCES `network_monitoring_targets`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
