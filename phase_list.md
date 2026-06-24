Absolutely. No code generation. Here’s the task list by phase.

**Phase 1: Project Initialization**
- Set up monorepo structure.
- Create `apps/web` Next.js app.
- Create `apps/api` NestJS app.
- Create `packages/database`, `packages/shared`, `packages/ui`.
- Configure TypeScript, ESLint, basic scripts.
- Add Docker Compose for MySQL and Redis.
- Add `.env.example`.
- Add basic docs and README.

**Phase 2: Core Administration**
- Add database tables: `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `audit_logs`, `notifications`.
- Add Prisma migration and seed.
- Seed super admin, default roles, and permissions.
- Build NestJS modules:
  - `AuthModule`
  - `UsersModule`
  - `RolesModule`
  - `PermissionsModule`
  - `AuditLogsModule`
  - `NotificationsModule`
- Add basic CRUD APIs.
- Add admin frontend pages:
  - `/admin/users`
  - `/admin/roles`
  - `/admin/permissions`
  - `/admin/audit-logs`

**Phase 3: Customer / CRM**
- Add customer tables:
  - `customers`
  - `customer_addresses`
  - `customer_documents`
- Build customer CRUD.
- Add search by name, account number, and mobile number.
- Add customer status badges.
- Add customer profile page.
- Add address management.
- Add document upload placeholder.
- Add frontend pages under `/crm/customers`.

**Phase 4: Referrals**
- Add tables:
  - `referrals`
  - `referral_rebates`
- Build manual referral encoding.
- Enforce one referrer per referred customer.
- Add one-time rebate workflow.
- Add referral status updates.
- Add frontend pages under `/crm/referrals`.

**Phase 5: Service Plans and Subscriptions**
- Add tables:
  - `service_plans`
  - `subscriptions`
- Build service plan CRUD.
- Assign plans to customers.
- Manage subscription status.
- Store billing day.
- Add auto-suspend and grace period settings.
- Add pages under `/isp/service-plans` and `/isp/subscriptions`.

**Phase 6: Billing**
- Add tables:
  - `billing_cycles`
  - `invoices`
  - `invoice_items`
  - `payments`
  - `customer_credits`
- Create billing cycles.
- Generate invoices from active subscriptions.
- Add invoice items.
- Post payments.
- Update balances and paid status.
- Apply referral rebates.
- Add collection summary.
- Add billing pages.

**Phase 7: MikroTik / PPPoE**
- Add tables:
  - `mikrotik_routers`
  - `pppoe_accounts`
  - `pppoe_sessions`
- Register routers.
- Manage PPPoE accounts.
- Add mock session/status monitoring.
- Do not connect to live MikroTik yet.
- Add network/PPPoE frontend pages.

**Phase 8: OLT / ONU**
- Add tables:
  - `olt_devices`
  - `onu_devices`
  - `onu_signal_logs`
  - `olt_alarm_logs`
- Register VSOL/CDATA OLT devices.
- Register and assign ONUs.
- Track mock signal/status data.
- Log signal history and alarms.
- Add device web interface link.
- Do not implement live Telnet, SSH, SNMP, or vendor APIs yet.

**Phase 9: Ticketing / Support**
- Add tables:
  - `tickets`
  - `ticket_messages`
- Create tickets.
- Assign tickets to users.
- Update priority and status.
- Add ticket messages.
- Show ticket timeline.
- Add support pages.

**Phase 10: Inventory**
- Add tables:
  - `inventory_categories`
  - `inventory_items`
  - `warehouses`
  - `inventory_stocks`
  - `inventory_movements`
- Build category, item, and warehouse CRUD.
- Add stock adjustments.
- Track stock movement logs.
- Add low stock alerts.
- Add inventory valuation.
- Add inventory pages.

**Phase 11: Project Management**
- Add tables:
  - `projects`
  - `project_material_estimates`
  - `project_material_usage`
- Create project registry.
- Add estimates and BOM.
- Record actual material usage.
- Deduct inventory when project is marked done.
- Compute actual material cost and total project cost.
- Compare estimated vs actual materials.
- Add project pages.

**Phase 12: Procurement**
- Add tables:
  - `suppliers`
  - `purchase_requests`
  - `purchase_request_items`
  - `purchase_orders`
  - `purchase_order_items`
  - `goods_receipts`
  - `goods_receipt_items`
- Build supplier management.
- Create purchase requests.
- Create purchase orders.
- Receive goods.
- Increase inventory on receiving.
- Update average cost and PO status.
- Add procurement pages.

**Phase 13: Socket.IO Realtime**
- Add NestJS Socket.IO gateway.
- Emit events for invoices, payments, customer status, tickets, network status, inventory, projects, and referrals.
- Connect Next.js to Socket.IO.
- Add notification badge.
- Add dashboard realtime updates.
- Add toast notifications.

**Phase 14: Reports**
- Add report endpoints and pages.
- Build reports for:
  - subscribers
  - billing
  - collections
  - referrals
  - network
  - inventory
  - projects
- Include active/suspended subscribers, monthly collections, outstanding invoices, stock summary, project costing, and material usage.

**Phase 15: Dashboard**
- Add dashboard cards:
  - total customers
  - active subscribers
  - suspended subscribers
  - monthly collection
  - outstanding balance
  - open tickets
  - active projects
  - low stock items
  - online/offline OLTs
  - online/offline ONUs
- Add charts:
  - monthly revenue
  - subscriber growth
  - ticket status
  - low stock
  - project profitability
- Wire dashboard to realtime events.