# NDTECH ISP Billing and Operations Management System
## Codex Development Prompt / README.md

You are Codex inside VS Code. Build this project step by step. Follow the database dependency order strictly. Do not skip phases. Do not generate unrelated features. Use clean architecture, reusable components, and readable code.

---

# 1. Project Goal

Build an ISP Billing and Operations Management System for NDTECH using:

- Frontend: Next.js
- Backend: NestJS
- Realtime: Socket.IO
- Database: MySQL
- ORM: Prisma
- Cache/Queue: Redis
- Authentication: JWT
- UI: Tailwind CSS + shadcn/ui

The system must support:

- Customer Management
- ISP Billing
- Service Plans
- Subscriptions
- Payments
- Referral Rebates
- MikroTik PPPoE Management
- VSOL and CDATA OLT Management
- ONU Assignment and Monitoring
- Tickets and Support
- Project Management
- Inventory Management
- Procurement
- Reports
- Role-Based Access Control
- Real-time Notifications

---

# 2. Project Structure

Create a monorepo:

```text
isp-billing-system/
├── apps/
│   ├── web/                 # Next.js frontend
│   └── api/                 # NestJS backend
│
├── packages/
│   ├── database/            # Prisma schema, migrations, seeders
│   ├── shared/              # Shared DTOs, enums, constants
│   └── ui/                  # Shared UI components
│
├── docs/
│   ├── database-plan.md
│   ├── menu-structure.md
│   └── development-phases.md
│
├── docker-compose.yml
├── .env.example
├── package.json
└── README.md
```

---

# 3. Global Rules

1. Use MySQL only.
2. Do not use Supabase.
3. Use Prisma for database schema and migrations.
4. Use NestJS modules per business module.
5. Use DTO validation in all API endpoints.
6. Use JWT authentication.
7. Use role-based access control.
8. Use soft delete where applicable.
9. Use audit logs for important actions.
10. Use Socket.IO for real-time dashboard events.
11. Follow dependency order of tables.
12. Each phase must include:
    - Prisma models
    - NestJS module
    - CRUD APIs
    - Basic Next.js pages
    - Sidebar menu entry if applicable
13. Do not implement MikroTik, VSOL, or CDATA live API first. Start with registry tables and mock status. Real integrations will be added later.
14. Keep code beginner-friendly and well commented.

---

# 4. Menu Grouping

Create the sidebar menu using these groups:

```text
Dashboard

CRM
├── Customers
├── Leads / Prospects
├── Referrals
└── Customer Documents

ISP Services
├── Service Plans
├── Subscriptions
├── PPPoE Accounts
└── Installation Requests

Billing
├── Billing Cycles
├── Invoices
├── Payments
├── Credits / Adjustments
└── Collections

Network Operations
├── MikroTik Routers
├── OLT Devices
├── ONU Devices
├── PPPoE Sessions
├── Network Monitoring
└── Network Alerts

Support
├── Tickets
├── Ticket Categories
└── Technician Assignments

Projects
├── Project Registry
├── Estimates
├── Bill of Materials
├── Material Usage
└── Project Costing

Inventory
├── Inventory Items
├── Categories
├── Warehouses
├── Stock Movements
└── Stock Adjustments

Procurement
├── Suppliers
├── Purchase Requests
├── Purchase Orders
└── Goods Receiving

Reports
├── Subscriber Reports
├── Billing Reports
├── Collection Reports
├── Referral Reports
├── Network Reports
├── Inventory Reports
└── Project Reports

Administration
├── Users
├── Roles
├── Permissions
├── System Settings
└── Audit Logs
```

---

# 5. Development Phase 1: Project Initialization

Create the base monorepo.

Tasks:

1. Initialize root package.
2. Create `apps/web` using Next.js.
3. Create `apps/api` using NestJS.
4. Create `packages/database`.
5. Configure TypeScript.
6. Configure ESLint and Prettier.
7. Add Docker Compose with:
   - MySQL
   - Redis
8. Add `.env.example`.

Required environment variables:

```env
DATABASE_URL="mysql://root:password@localhost:3306/isp_billing"
JWT_SECRET="change_this_secret"
REDIS_HOST="localhost"
REDIS_PORT="6379"
API_PORT="4000"
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:4000"
# Optional fallbacks if not saved in Admin → Integration Settings
SEMAPHORE_API_KEY=""
SEMAPHORE_SENDER_NAME="NDTECH"
SMS_ENABLED="true"
```

For Docker-based development (API + Web + MySQL + Redis) using a **separate** `.env.docker` file, see [DOCKER.md](./DOCKER.md).

---

# 6. Development Phase 2: Core Administration Tables

Build these first because other modules depend on users and roles.

Tables:

```text
users
roles
permissions
user_roles
role_permissions
audit_logs
notifications
```

Prisma models must include:

## users

```text
id
name
email
mobile_number
password_hash
status: active, inactive, suspended
last_login_at
created_at
updated_at
deleted_at
```

## roles

```text
id
name
description
created_at
updated_at
```

## permissions

```text
id
module
action
description
created_at
updated_at
```

## user_roles

```text
id
user_id
role_id
created_at
```

## role_permissions

```text
id
role_id
permission_id
created_at
```

## audit_logs

```text
id
user_id nullable
action
module
reference_id nullable
old_value JSON nullable
new_value JSON nullable
ip_address nullable
created_at
```

## notifications

```text
id
user_id nullable
customer_id nullable
title
message
notification_type
channel: system, sms, email, socket
is_read
created_at
```

NestJS modules:

```text
AuthModule
UsersModule
RolesModule
PermissionsModule
AuditLogsModule
NotificationsModule
```

Frontend pages:

```text
/admin/users
/admin/roles
/admin/permissions
/admin/audit-logs
```

---

# 7. Development Phase 3: Customer / CRM Module

Build customer records after users are available.

Tables:

```text
customers
customer_addresses
customer_documents
```

## customers

```text
id
account_number unique
customer_type: residential, business, government
first_name nullable
last_name nullable
business_name nullable
email nullable
mobile_number
status: lead, prospect, active, suspended, disconnected, terminated
referred_by_customer_id nullable self relation
created_by_user_id
created_at
updated_at
deleted_at
```

## customer_addresses

```text
id
customer_id
address_type: billing, installation
street
barangay
municipality
province
latitude nullable
longitude nullable
created_at
updated_at
```

## customer_documents

```text
id
customer_id
document_type
file_path
uploaded_by_user_id
created_at
```

NestJS module:

```text
CustomersModule
CustomerAddressesModule
CustomerDocumentsModule
```

Frontend pages:

```text
/crm/customers
/crm/customers/create
/crm/customers/[id]
/crm/customers/[id]/documents
```

Required features:

1. Customer CRUD.
2. Search by name, account number, mobile number.
3. Customer status badge.
4. Customer profile page.
5. Customer address management.
6. Upload customer document placeholder.

---

# 8. Development Phase 4: Referral Module

Build after customers.

Tables:

```text
referrals
referral_rebates
```

## referrals

```text
id
referrer_customer_id
referred_customer_id
status: pending, qualified, rebate_applied, cancelled
qualified_at nullable
applied_invoice_id nullable
notes nullable
created_by_user_id
created_at
updated_at
```

## referral_rebates

```text
id
referral_id
referrer_customer_id
referred_customer_id
invoice_id nullable
rebate_type: fixed, percentage
rebate_value
rebate_amount
status: pending, applied, voided
applied_at nullable
created_at
updated_at
```

Business rules:

1. No referral code.
2. Referral is encoded manually by selecting the referrer customer.
3. One referred customer can only have one referrer.
4. Rebate is applied one time only.
5. Rebate is applied to the referrer’s next billing cycle.
6. Once rebate is applied, referral status becomes `rebate_applied`.

Frontend pages:

```text
/crm/referrals
/crm/referrals/create
/crm/referrals/[id]
```

---

# 9. Development Phase 5: ISP Service Plans and Subscriptions

Build after customers.

Tables:

```text
service_plans
subscriptions
```

## service_plans

```text
id
name
description nullable
download_speed_mbps
upload_speed_mbps
monthly_price
installation_fee
billing_type: prepaid, postpaid
is_active
created_at
updated_at
```

## subscriptions

```text
id
customer_id
service_plan_id
pppoe_account_id nullable
billing_day
start_date
end_date nullable
status: active, suspended, cancelled, terminated
auto_suspend_enabled
grace_period_days
created_at
updated_at
```

Frontend pages:

```text
/isp/service-plans
/isp/subscriptions
/isp/subscriptions/create
```

Features:

1. Plan CRUD.
2. Assign plan to customer.
3. Change subscription status.
4. Store billing day.
5. Enable or disable auto suspension.

---

# 10. Development Phase 6: Billing Module

Build after customers, service plans, and subscriptions.

Tables:

```text
billing_cycles
invoices
invoice_items
payments
customer_credits
```

## billing_cycles

```text
id
name
start_date
end_date
due_date
status: open, closed, locked
created_at
updated_at
```

## invoices

```text
id
customer_id
subscription_id nullable
billing_cycle_id
invoice_number unique
subtotal
discount_total
rebate_total
tax_total
total_amount
paid_amount
balance
due_date
status: draft, unpaid, partial, paid, overdue, void
created_at
updated_at
```

## invoice_items

```text
id
invoice_id
item_type: plan, installation, addon, penalty, rebate, adjustment, project
description
quantity
unit_price
amount
reference_type nullable
reference_id nullable
created_at
```

## payments

```text
id
customer_id
invoice_id nullable
payment_number unique
payment_method: cash, gcash, maya, bank, check, credit
amount
reference_number nullable
received_by_user_id
payment_date
created_at
```

## customer_credits

```text
id
customer_id
source_type: overpayment, rebate, adjustment, refund
source_id nullable
amount
remaining_amount
status: active, used, voided
created_at
```

Billing features:

1. Create billing cycle.
2. Generate invoice for active subscriptions.
3. Add invoice items.
4. Post payment.
5. Update invoice balance.
6. Mark invoice as paid when balance is zero.
7. Apply referral rebate as negative invoice item.
8. Generate collection summary.

Frontend pages:

```text
/billing/cycles
/billing/invoices
/billing/invoices/[id]
/billing/payments
/billing/credits
/billing/collections
```

---

# 11. Development Phase 7: MikroTik / PPPoE Module

Build after customers and subscriptions.

Tables:

```text
mikrotik_routers
pppoe_accounts
pppoe_sessions
```

## mikrotik_routers

```text
id
name
ip_address
api_port
username
password_encrypted
location
status: online, offline, unknown
last_checked_at nullable
created_at
updated_at
```

## pppoe_accounts

```text
id
customer_id
mikrotik_router_id
username
password_encrypted
profile_name
service_name nullable
status: active, disabled, suspended
last_online_at nullable
created_at
updated_at
```

## pppoe_sessions

```text
id
pppoe_account_id
ip_address nullable
mac_address nullable
uptime nullable
rx_bytes
tx_bytes
status: online, offline
checked_at
```

Important:

Start with registry and mock monitoring only.
Do not connect to live MikroTik yet.

Frontend pages:

```text
/network/mikrotik-routers
/isp/pppoe-accounts
/network/pppoe-sessions
```

---

# 12. Development Phase 8: OLT / ONU Module

Build after customers.

Supported OLT brands:

```text
VSOL
CDATA
```

Tables:

```text
olt_devices
onu_devices
onu_signal_logs
olt_alarm_logs
```

## olt_devices

```text
id
name
brand: VSOL, CDATA
model
ip_address
management_port
username
password_encrypted
location
status: online, offline, unknown
last_checked_at nullable
created_at
updated_at
```

## onu_devices

```text
id
customer_id nullable
olt_device_id
pon_port
onu_id
serial_number
mac_address nullable
rx_power nullable
tx_power nullable
status: online, offline, los, disabled, unknown
last_seen_at nullable
created_at
updated_at
```

## onu_signal_logs

```text
id
onu_device_id
rx_power nullable
tx_power nullable
status
checked_at
```

## olt_alarm_logs

```text
id
olt_device_id
onu_device_id nullable
alarm_type
severity: low, medium, high, critical
message
created_at
```

Features:

1. Register VSOL/CDAT OLT.
2. List OLTs.
3. View OLT details.
4. Register ONU.
5. Assign ONU to customer.
6. Show ONU signal.
7. Show ONU status.
8. Log ONU signal history.
9. Log OLT alarms.
10. Provide button/link to open device web interface.

Important:

Start with manual/mocked data.
Do not implement live Telnet, SSH, SNMP, or vendor API yet.

Frontend pages:

```text
/network/olt-devices
/network/olt-devices/[id]
/network/onu-devices
/network/onu-devices/[id]
/network/olt-alarms
```

---

# 13. Development Phase 9: Ticketing / Support Module

Build after customers and users.

Tables:

```text
tickets
ticket_messages
```

## tickets

```text
id
ticket_number unique
customer_id nullable
assigned_user_id nullable
category
priority: low, medium, high, critical
status: open, in_progress, resolved, closed, cancelled
subject
description
created_at
updated_at
```

## ticket_messages

```text
id
ticket_id
sender_user_id nullable
sender_customer_id nullable
message
created_at
```

Frontend pages:

```text
/support/tickets
/support/tickets/create
/support/tickets/[id]
```

Features:

1. Create ticket.
2. Assign ticket to user.
3. Update priority.
4. Update status.
5. Add ticket messages.
6. Show ticket timeline.

---

# 14. Development Phase 10: Inventory Module

Build before Projects and Procurement.

Tables:

```text
inventory_categories
inventory_items
warehouses
inventory_stocks
inventory_movements
```

## inventory_categories

```text
id
name
description nullable
created_at
updated_at
```

## inventory_items

```text
id
sku unique
item_name
category_id
unit
current_stock
average_cost
selling_price
reorder_level
is_active
created_at
updated_at
```

## warehouses

```text
id
name
location
warehouse_type: main, branch, vehicle
created_at
updated_at
```

## inventory_stocks

```text
id
inventory_item_id
warehouse_id
quantity
updated_at
```

## inventory_movements

```text
id
inventory_item_id
warehouse_id
movement_type: stock_in, stock_out, project_usage, return, adjustment
project_id nullable
quantity
unit_cost
total_cost
remarks nullable
created_by_user_id
created_at
```

Features:

1. Inventory item CRUD.
2. Category CRUD.
3. Warehouse CRUD.
4. Stock adjustment.
5. Stock movement log.
6. Low stock alert.
7. Inventory valuation.

Frontend pages:

```text
/inventory/items
/inventory/categories
/inventory/warehouses
/inventory/movements
/inventory/adjustments
```

---

# 15. Development Phase 11: Project Management Module

Build after customers, users, and inventory.

Tables:

```text
projects
project_material_estimates
project_material_usage
```

## projects

```text
id
project_code unique
customer_id nullable
project_type: cctv, solar, ftth, network_cabling, wifi, repair, custom
project_name
site_address
status: draft, estimated, approved, in_progress, done, cancelled
estimated_labor_cost
estimated_material_cost
actual_material_cost
other_charges
total_project_cost
started_at nullable
completed_at nullable
created_by_user_id
created_at
updated_at
```

## project_material_estimates

```text
id
project_id
inventory_item_id
estimated_quantity
estimated_unit_cost
estimated_total_cost
created_at
```

## project_material_usage

```text
id
project_id
inventory_item_id
used_quantity
unit_cost
total_cost
encoded_by_user_id
created_at
```

Business rules:

1. Estimate does not deduct inventory.
2. Material usage records actual materials.
3. When project status becomes `done`, deduct actual materials from inventory.
4. Create inventory movement with movement_type `project_usage`.
5. Compute actual material cost.
6. Compute total project cost.
7. Prevent duplicate deduction if project is already done.
8. Allow comparison of estimated vs actual materials.

Frontend pages:

```text
/projects
/projects/create
/projects/[id]
/projects/[id]/estimate
/projects/[id]/bom
/ projects/[id]/usage
/projects/[id]/costing
```

Fix route typo:
Use `/projects/[id]/usage`, not `/ projects/[id]/usage`.

Project types:

```text
CCTV Installation
Solar Installation
FTTH Installation
Structured Cabling
WiFi Deployment
Repair / Maintenance
Custom Project
```

---

# 16. Development Phase 12: Procurement Module

Build after inventory and users.

Tables:

```text
suppliers
purchase_requests
purchase_request_items
purchase_orders
purchase_order_items
goods_receipts
goods_receipt_items
```

## suppliers

```text
id
supplier_name
contact_person nullable
mobile_number nullable
email nullable
address nullable
created_at
updated_at
```

## purchase_requests

```text
id
request_number unique
requested_by_user_id
status: draft, submitted, approved, rejected, ordered
remarks nullable
created_at
updated_at
```

## purchase_request_items

```text
id
purchase_request_id
inventory_item_id
quantity
estimated_cost
```

## purchase_orders

```text
id
po_number unique
supplier_id
purchase_request_id nullable
status: draft, sent, partial, received, cancelled
total_amount
created_at
updated_at
```

## purchase_order_items

```text
id
purchase_order_id
inventory_item_id
quantity
unit_cost
total_cost
```

## goods_receipts

```text
id
purchase_order_id
received_by_user_id
warehouse_id
received_date
created_at
```

## goods_receipt_items

```text
id
goods_receipt_id
inventory_item_id
received_quantity
unit_cost
```

Business rules:

1. Purchase request is internal request.
2. Purchase order is supplier order.
3. Goods receipt increases inventory stock.
4. Create inventory movement with movement_type `stock_in`.
5. Update average cost when goods are received.
6. Update purchase order status.

Frontend pages:

```text
/procurement/suppliers
/procurement/purchase-requests
/procurement/purchase-orders
/procurement/goods-receiving
```

---

# 17. Development Phase 13: Socket.IO Realtime

Build after core modules.

Create NestJS Socket Gateway.

Events:

```text
billing.invoice.created
billing.payment.received
customer.status.changed
subscription.suspended
subscription.reactivated
network.device.offline
network.device.online
olt.alarm.created
onu.status.changed
ticket.created
ticket.updated
project.completed
inventory.low_stock
referral.rebate.applied
```

Frontend requirements:

1. Connect Next.js app to Socket.IO.
2. Show real-time notification badge.
3. Update dashboard cards in real-time.
4. Show toast notifications.

---

# 18. Development Phase 14: Reports

Build after modules have data.

Reports:

```text
Subscriber Reports
Billing Reports
Collection Reports
Referral Reports
Network Reports
Inventory Reports
Project Reports
```

Report pages:

```text
/reports/subscribers
/reports/billing
/reports/collections
/reports/referrals
/reports/network
/reports/inventory
/reports/projects
```

Minimum reports:

1. Active subscribers.
2. Suspended subscribers.
3. Monthly collections.
4. Outstanding invoices.
5. Referral rebates.
6. OLT/ONU status.
7. Stock summary.
8. Stock movements.
9. Project costing.
10. Material usage by project.

---

# 19. Development Phase 15: Dashboard

Build the dashboard after all major modules.

Dashboard cards:

```text
Total Customers
Active Subscribers
Suspended Subscribers
Monthly Collection
Outstanding Balance
Open Tickets
Active Projects
Low Stock Items
Online OLTs
Offline OLTs
Online ONUs
Offline ONUs
```

Charts:

```text
Monthly Revenue
Subscriber Growth
Ticket Status
Inventory Low Stock
Project Profitability
```

---

# 20. Seed Data

Create seed data for:

```text
Super Admin User
Default Roles
Default Permissions
Sample Customers
Sample Service Plans
Sample Billing Cycle
Sample Inventory Categories
Sample Inventory Items
Sample Warehouse
Sample OLT Device
Sample MikroTik Router
```

Default admin:

```text
Email: admin@ndtech.local
Password: Admin@12345
```

---

# 21. API Standards

Use RESTful endpoints.

Example:

```text
GET /customers
POST /customers
GET /customers/:id
PATCH /customers/:id
DELETE /customers/:id
```

All list endpoints must support:

```text
search
page
limit
sort
filter
```

Example:

```text
GET /customers?search=juan&page=1&limit=10
```

---

# 22. UI Standards

Use:

```text
Next.js App Router
Tailwind CSS
shadcn/ui
TanStack Table
React Hook Form
Zod Validation
```

Every list page must have:

```text
Search
Filter
Pagination
Create Button
Edit Button
View Button
Status Badge
```

Every form must have:

```text
Validation
Loading State
Success Toast
Error Toast
Cancel Button
Save Button
```

---

# 23. Security Requirements

1. Passwords must be hashed.
2. Sensitive device passwords must be encrypted.
3. Use JWT authentication.
4. Protect all admin routes.
5. Implement role-based permissions.
6. Add audit logs for:
   - Customer create/update/delete
   - Invoice creation
   - Payment posting
   - Project done
   - Inventory adjustment
   - User role changes
7. Never expose encrypted passwords in API responses.

---

# 24. Recommended Build Order Summary

Follow this exact order:

```text
1. Project initialization
2. Users, roles, permissions
3. Auth and JWT
4. Customers
5. Customer addresses and documents
6. Referrals
7. Service plans
8. Subscriptions
9. Billing cycles
10. Invoices
11. Invoice items
12. Payments
13. Customer credits
14. MikroTik routers
15. PPPoE accounts
16. PPPoE sessions
17. OLT devices
18. ONU devices
19. ONU signal logs
20. OLT alarm logs
21. Tickets
22. Ticket messages
23. Inventory categories
24. Inventory items
25. Warehouses
26. Inventory stocks
27. Inventory movements
28. Projects
29. Project material estimates
30. Project material usage
31. Suppliers
32. Purchase requests
33. Purchase request items
34. Purchase orders
35. Purchase order items
36. Goods receipts
37. Goods receipt items
38. Socket.IO gateway
39. Reports
40. Dashboard
```

---

# 25. First Codex Task

Start now with Phase 1 only.

Generate:

1. Monorepo folder structure.
2. `apps/web` Next.js app.
3. `apps/api` NestJS app.
4. `packages/database`.
5. Docker Compose for MySQL and Redis.
6. `.env.example`.
7. Root README.
8. Basic scripts:
   - dev:web
   - dev:api
   - db:migrate
   - db:seed

Do not proceed to Phase 2 until Phase 1 is complete.
# NDTECH-ISP-MANAGEMENT
