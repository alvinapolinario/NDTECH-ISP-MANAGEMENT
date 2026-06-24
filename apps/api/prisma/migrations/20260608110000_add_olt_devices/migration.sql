CREATE TABLE `olt_devices` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `vendor` VARCHAR(191) NOT NULL,
  `model` VARCHAR(191) NULL,
  `host` VARCHAR(191) NOT NULL,
  `management_ip` VARCHAR(191) NULL,
  `pon_technology` ENUM('gpon', 'epon', 'xgpon', 'xgspon', 'xpon') NOT NULL DEFAULT 'gpon',
  `pon_port_count` INTEGER NOT NULL DEFAULT 0,
  `uplink_port_count` INTEGER NOT NULL DEFAULT 0,
  `snmp_version` ENUM('v1', 'v2c', 'v3') NOT NULL DEFAULT 'v2c',
  `snmp_community` VARCHAR(191) NULL,
  `status` ENUM('active', 'inactive', 'maintenance') NOT NULL DEFAULT 'active',
  `location` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `last_polled_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  UNIQUE INDEX `olt_devices_host_key`(`host`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
