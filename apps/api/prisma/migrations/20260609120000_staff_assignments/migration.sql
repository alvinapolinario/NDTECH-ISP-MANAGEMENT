-- Staff assignment foreign keys for collectors and installers

ALTER TABLE `payments`
  ADD COLUMN `collector_user_id` INTEGER NULL,
  ADD CONSTRAINT `payments_collector_user_id_fkey`
    FOREIGN KEY (`collector_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `collection_cases`
  ADD COLUMN `assigned_collector_user_id` INTEGER NULL,
  ADD CONSTRAINT `collection_cases_assigned_collector_user_id_fkey`
    FOREIGN KEY (`assigned_collector_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `installation_requests`
  ADD COLUMN `assigned_installer_user_id` INTEGER NULL,
  ADD CONSTRAINT `installation_requests_assigned_installer_user_id_fkey`
    FOREIGN KEY (`assigned_installer_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
