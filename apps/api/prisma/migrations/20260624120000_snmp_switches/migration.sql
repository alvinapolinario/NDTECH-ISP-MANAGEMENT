-- AlterEnum: add switch_device to network monitoring device types
ALTER TABLE `network_monitoring_targets` MODIFY `device_type` ENUM('mikrotik_router', 'olt_device', 'onu_device', 'switch_device', 'other') NOT NULL DEFAULT 'other';

-- AlterTable: OLT SNMP poll snapshot fields
ALTER TABLE `olt_devices`
  ADD COLUMN `snmp_port` INTEGER NOT NULL DEFAULT 161,
  ADD COLUMN `sys_descr` TEXT NULL,
  ADD COLUMN `sys_name` VARCHAR(191) NULL,
  ADD COLUMN `uptime_seconds` INTEGER NULL;

-- CreateTable: switch_devices
CREATE TABLE `switch_devices` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `vendor` ENUM('mikrotik', 'unifi', 'edgeswitch') NOT NULL,
  `model` VARCHAR(191) NULL,
  `host` VARCHAR(191) NOT NULL,
  `management_ip` VARCHAR(191) NULL,
  `snmp_version` ENUM('v1', 'v2c', 'v3') NOT NULL DEFAULT 'v2c',
  `snmp_community` VARCHAR(191) NULL,
  `snmp_port` INTEGER NOT NULL DEFAULT 161,
  `status` ENUM('active', 'inactive', 'maintenance') NOT NULL DEFAULT 'active',
  `location` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `sys_descr` TEXT NULL,
  `sys_name` VARCHAR(191) NULL,
  `uptime_seconds` INTEGER NULL,
  `cpu_usage_percent` DECIMAL(5, 2) NULL,
  `memory_usage_percent` DECIMAL(5, 2) NULL,
  `port_count` INTEGER NOT NULL DEFAULT 0,
  `ports_up` INTEGER NOT NULL DEFAULT 0,
  `last_polled_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  UNIQUE INDEX `switch_devices_host_key`(`host`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: onu_signal_logs
CREATE TABLE `onu_signal_logs` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `onu_device_id` INTEGER NOT NULL,
  `rx_power` DECIMAL(6, 2) NULL,
  `tx_power` DECIMAL(6, 2) NULL,
  `distance_meters` INTEGER NULL,
  `polled_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `onu_signal_logs_onu_device_id_polled_at_idx`(`onu_device_id`, `polled_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: monitoring targets link to switches
ALTER TABLE `network_monitoring_targets`
  ADD COLUMN `switch_device_id` INTEGER NULL;

ALTER TABLE `network_monitoring_targets`
  ADD CONSTRAINT `network_monitoring_targets_switch_device_id_fkey`
  FOREIGN KEY (`switch_device_id`) REFERENCES `switch_devices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `onu_signal_logs`
  ADD CONSTRAINT `onu_signal_logs_onu_device_id_fkey`
  FOREIGN KEY (`onu_device_id`) REFERENCES `onu_devices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
