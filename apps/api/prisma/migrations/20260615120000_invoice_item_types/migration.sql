ALTER TABLE `invoice_items` MODIFY `item_type` ENUM(
  'recurring_service',
  'installation_fee',
  'adjustment',
  'repair',
  'connector',
  'previous_balance',
  'other'
) NOT NULL DEFAULT 'recurring_service';
