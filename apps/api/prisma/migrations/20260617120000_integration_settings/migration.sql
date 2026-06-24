CREATE TABLE `integration_settings` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(191) NOT NULL,
  `value_encrypted` TEXT NULL,
  `value_plain` TEXT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  `updated_by_user_id` INTEGER NULL,

  UNIQUE INDEX `integration_settings_key_key`(`key`),
  PRIMARY KEY (`id`),
  CONSTRAINT `integration_settings_updated_by_user_id_fkey`
    FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
