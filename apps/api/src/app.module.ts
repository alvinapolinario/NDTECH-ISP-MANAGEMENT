import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BearerAuthGuard } from './auth/bearer-auth.guard';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CustomersModule } from './customers/customers.module';
import { CustomerAddressesModule } from './customer-addresses/customer-addresses.module';
import { CustomerDocumentsModule } from './customer-documents/customer-documents.module';
import { LocationsModule } from './locations/locations.module';
import { ServicePlansModule } from './service-plans/service-plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { MikrotikModule } from './mikrotik/mikrotik.module';
import { InstallationRequestsModule } from './installation-requests/installation-requests.module';
import { BillingCyclesModule } from './billing-cycles/billing-cycles.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { BillingAdjustmentsModule } from './billing-adjustments/billing-adjustments.module';
import { CollectionsModule } from './collections/collections.module';
import { OltDevicesModule } from './olt-devices/olt-devices.module';
import { OnuDevicesModule } from './onu-devices/onu-devices.module';
import { NetworkMonitoringModule } from './network-monitoring/network-monitoring.module';
import { NetworkAlertsModule } from './network-alerts/network-alerts.module';
import { InventoryCategoriesModule } from './inventory-categories/inventory-categories.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { InventoryItemsModule } from './inventory-items/inventory-items.module';
import { InventoryMovementsModule } from './inventory-movements/inventory-movements.module';
import { InventoryAdjustmentsModule } from './inventory-adjustments/inventory-adjustments.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchaseRequestsModule } from './purchase-requests/purchase-requests.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { GoodsReceiptsModule } from './goods-receipts/goods-receipts.module';
import { TicketCategoriesModule } from './ticket-categories/ticket-categories.module';
import { TicketsModule } from './tickets/tickets.module';
import { TechnicianAssignmentsModule } from './technician-assignments/technician-assignments.module';
import { ProjectsModule } from './projects/projects.module';
import { ProjectEstimatesModule } from './project-estimates/project-estimates.module';
import { ProjectBomsModule } from './project-boms/project-boms.module';
import { ProjectMaterialUsagesModule } from './project-material-usages/project-material-usages.module';
import { ProjectCostingsModule } from './project-costings/project-costings.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { ExpenseCategoriesModule } from './expense-categories/expense-categories.module';
import { ExpensesModule } from './expenses/expenses.module';
import { CollectorSyncModule } from './collector-sync/collector-sync.module';
import { IntegrationSettingsModule } from './integration-settings/integration-settings.module';
import { SmsModule } from './sms/sms.module';
import { SwitchDevicesModule } from './switch-devices/switch-devices.module';
import { NetworkSnmpSchedulerModule } from './snmp/network-snmp-scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath:
        process.env.DOCKER_ENV === 'true'
          ? ['../../.env.docker']
          : ['.env', '../../.env'],
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    AuditLogsModule,
    NotificationsModule,
    CustomersModule,
    CustomerAddressesModule,
    CustomerDocumentsModule,
    LocationsModule,
    ServicePlansModule,
    SubscriptionsModule,
    MikrotikModule,
    InstallationRequestsModule,
    BillingCyclesModule,
    InvoicesModule,
    PaymentsModule,
    BillingAdjustmentsModule,
    CollectionsModule,
    OltDevicesModule,
    OnuDevicesModule,
    SwitchDevicesModule,
    NetworkSnmpSchedulerModule,
    NetworkMonitoringModule,
    NetworkAlertsModule,
    InventoryCategoriesModule,
    WarehousesModule,
    InventoryItemsModule,
    InventoryMovementsModule,
    InventoryAdjustmentsModule,
    SuppliersModule,
    PurchaseRequestsModule,
    PurchaseOrdersModule,
    GoodsReceiptsModule,
    TicketCategoriesModule,
    TicketsModule,
    TechnicianAssignmentsModule,
    ProjectsModule,
    ProjectEstimatesModule,
    ProjectBomsModule,
    ProjectMaterialUsagesModule,
    ProjectCostingsModule,
    DashboardModule,
    ReportsModule,
    ExpenseCategoriesModule,
    ExpensesModule,
    CollectorSyncModule,
    IntegrationSettingsModule,
    SmsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: BearerAuthGuard,
    },
  ],
})
export class AppModule {}
