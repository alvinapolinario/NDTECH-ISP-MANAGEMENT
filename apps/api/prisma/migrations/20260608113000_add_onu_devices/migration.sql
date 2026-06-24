CREATE TABLE `onu_devices` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `olt_device_id` INTEGER NOT NULL,
  `customer_id` INTEGER NULL,
  `subscription_id` INTEGER NULL,
  `name` VARCHAR(191) NULL,
  `serial_number` VARCHAR(191) NOT NULL,
  `mac_address` VARCHAR(191) NULL,
  `pon_port` VARCHAR(191) NOT NULL,
  `onu_id` VARCHAR(191) NOT NULL,
  `vlan` INTEGER NULL,
  `profile_name` VARCHAR(191) NULL,
  `status` ENUM('online', 'offline', 'los', 'disabled', 'pending') NOT NULL DEFAULT 'pending',
  `rx_power` DECIMAL(6, 2) NULL,
  `tx_power` DECIMAL(6, 2) NULL,
  `distance_meters` INTEGER NULL,
  `last_registered_at` DATETIME(3) NULL,
  `last_deregistered_at` DATETIME(3) NULL,
  `last_deregistered_reason` VARCHAR(191) NULL,
  `location` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `last_polled_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  UNIQUE INDEX `onu_devices_serial_number_key`(`serial_number`),
  UNIQUE INDEX `onu_devices_olt_device_id_pon_port_onu_id_key`(`olt_device_id`, `pon_port`, `onu_id`),
  INDEX `onu_devices_customer_id_idx`(`customer_id`),
  INDEX `onu_devices_subscription_id_idx`(`subscription_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `onu_devices`
  ADD CONSTRAINT `onu_devices_olt_device_id_fkey`
  FOREIGN KEY (`olt_device_id`) REFERENCES `olt_devices`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `onu_devices`
  ADD CONSTRAINT `onu_devices_customer_id_fkey`
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `onu_devices`
  ADD CONSTRAINT `onu_devices_subscription_id_fkey`
  FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
