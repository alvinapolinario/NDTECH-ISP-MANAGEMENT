-- Finance assignments and contractor project fields

ALTER TABLE `invoices`
  ADD COLUMN `assigned_finance_user_id` INTEGER NULL,
  ADD CONSTRAINT `invoices_assigned_finance_user_id_fkey`
    FOREIGN KEY (`assigned_finance_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `billing_adjustments`
  ADD COLUMN `assigned_finance_user_id` INTEGER NULL,
  ADD CONSTRAINT `billing_adjustments_assigned_finance_user_id_fkey`
    FOREIGN KEY (`assigned_finance_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `collection_cases`
  ADD COLUMN `assigned_finance_user_id` INTEGER NULL,
  ADD CONSTRAINT `collection_cases_assigned_finance_user_id_fkey`
    FOREIGN KEY (`assigned_finance_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `purchase_requests`
  ADD COLUMN `finance_reviewer_user_id` INTEGER NULL,
  ADD CONSTRAINT `purchase_requests_finance_reviewer_user_id_fkey`
    FOREIGN KEY (`finance_reviewer_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `projects`
  MODIFY COLUMN `project_type` ENUM(
    'expansion',
    'backbone',
    'customer_install',
    'maintenance',
    'other',
    'cctv',
    'solar',
    'outsourced'
  ) NOT NULL DEFAULT 'expansion';

ALTER TABLE `projects`
  ADD COLUMN `contractor_user_id` INTEGER NULL,
  ADD CONSTRAINT `projects_contractor_user_id_fkey`
    FOREIGN KEY (`contractor_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
