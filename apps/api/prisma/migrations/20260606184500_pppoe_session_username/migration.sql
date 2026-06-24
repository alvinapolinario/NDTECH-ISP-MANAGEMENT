-- Allow browsing active PPPoE sessions directly from MikroTik /ppp/active.
ALTER TABLE `pppoe_sessions`
  ADD COLUMN `username` VARCHAR(191) NOT NULL DEFAULT '' AFTER `router_id`,
  MODIFY `pppoe_account_id` INTEGER NULL;
