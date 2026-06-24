# Database Plan

Phase 1 creates the project structure only.

Phase 2 defines the core administration tables:

- users
- roles
- permissions
- user_roles
- role_permissions
- audit_logs
- notifications

Migration file:

- `apps/api/prisma/migrations/20260606112500_phase_2_core_administration/migration.sql`

Phase 3 defines the CRM customer tables:

- customers
- customer_addresses
- customer_documents
- provinces
- municipalities
- barangays

Customer map location is stored as separate `latitude` and `longitude` columns. The UI accepts one `Lat, Long` field and splits it before saving.

Customer addresses also support an optional `barangay_id` for normalized geographic analysis. The province and municipality can be derived through `barangays -> municipalities -> provinces`, while the text address fields remain available for flexible manual entry.

Migration file:

- `apps/api/prisma/migrations/20260606120000_phase_3_customer_crm/migration.sql`
- `apps/api/prisma/migrations/20260606123000_location_reference_tables/migration.sql`

Service Plans are wired as the first ISP Services catalog table:

- service_plans

Migration file:

- `apps/api/prisma/migrations/20260606133000_service_plans/migration.sql`

Subscriptions link customers to service plans:

- subscriptions

Migration file:

- `apps/api/prisma/migrations/20260606143000_subscriptions/migration.sql`

MikroTik integration tables:

- mikrotik_routers
- pppoe_accounts
- pppoe_sessions
- mikrotik_command_logs

Migration file:

- `apps/api/prisma/migrations/20260606153000_mikrotik_integration/migration.sql`
