import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';
import { createDatabasePoolConfig } from '../src/prisma/database-pool.config';

config({ path: '.env' });
config({ path: '../../.env', override: true });

const adapter = new PrismaMariaDb(createDatabasePoolConfig());
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('Admin@12345', 10);

  const adminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: {
      name: 'Super Admin',
      description: 'Full system access',
    },
  });

  const defaultPermissions = [
    ['users', 'manage', 'Manage users'],
    ['roles', 'manage', 'Manage roles'],
    ['permissions', 'manage', 'Manage permissions'],
    ['audit_logs', 'read', 'Read audit logs'],
    ['notifications', 'manage', 'Manage notifications'],
  ];

  for (const [module, action, description] of defaultPermissions) {
    const permission = await prisma.permission.upsert({
      where: { module_action: { module, action } },
      update: { description },
      create: { module, action, description },
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@ndtech.local' },
    update: {
      name: 'Super Admin',
      passwordHash,
      status: 'active',
    },
    create: {
      name: 'Super Admin',
      email: 'admin@ndtech.local',
      passwordHash,
      status: 'active',
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  const staffRoleDefinitions = [
    {
      name: 'Collector',
      description: 'Field staff assigned to payment collection cases',
    },
    {
      name: 'Installer',
      description: 'Field staff assigned to customer installation jobs',
    },
    {
      name: 'Finance',
      description: 'Staff assigned to finance review and approval tasks',
    },
    {
      name: 'Contractor',
      description: 'External contractors assigned to outsourced projects',
    },
  ];

  const staffRoles: Record<string, { id: number }> = {};

  for (const role of staffRoleDefinitions) {
    staffRoles[role.name] = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  const fieldPermissions = [
    ['collections', 'read_assigned', 'Read assigned collection cases'],
    ['collections', 'update_assigned', 'Update assigned collection cases'],
    ['payments', 'record_assigned', 'Record payments for assigned work'],
    ['installations', 'read_assigned', 'Read assigned installation jobs'],
    ['installations', 'update_assigned', 'Update assigned installation jobs'],
    ['finance', 'read_assigned', 'Read assigned finance tasks'],
    ['finance', 'approve_assigned', 'Approve assigned finance tasks'],
    ['projects', 'read_assigned', 'Read assigned contractor projects'],
    ['projects', 'update_assigned', 'Update assigned contractor projects'],
  ];

  for (const [module, action, description] of fieldPermissions) {
    const permission = await prisma.permission.upsert({
      where: { module_action: { module, action } },
      update: { description },
      create: { module, action, description },
    });

    for (const roleName of Object.keys(staffRoles)) {
      const roleId = staffRoles[roleName].id;
      const shouldAssign =
        (roleName === 'Collector' &&
          (module === 'collections' || module === 'payments')) ||
        (roleName === 'Installer' && module === 'installations') ||
        (roleName === 'Finance' && module === 'finance') ||
        (roleName === 'Contractor' && module === 'projects');

      if (!shouldAssign) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId,
          permissionId: permission.id,
        },
      });
    }
  }

  const staffPasswordHash = await bcrypt.hash('Staff@12345', 10);
  const staffUsers = [
    {
      name: 'Maria Santos',
      email: 'collector1@ndtech.local',
      mobileNumber: '09181112222',
      roleName: 'Collector',
    },
    {
      name: 'Juan Dela Cruz',
      email: 'installer1@ndtech.local',
      mobileNumber: '09183334444',
      roleName: 'Installer',
    },
    {
      name: 'Ana Reyes',
      email: 'finance1@ndtech.local',
      mobileNumber: '09185556666',
      roleName: 'Finance',
    },
    {
      name: 'SolarTech PH',
      email: 'contractor1@ndtech.local',
      mobileNumber: '09187778888',
      roleName: 'Contractor',
    },
  ];

  for (const staff of staffUsers) {
    const user = await prisma.user.upsert({
      where: { email: staff.email },
      update: {
        name: staff.name,
        mobileNumber: staff.mobileNumber,
        passwordHash: staffPasswordHash,
        status: 'active',
      },
      create: {
        name: staff.name,
        email: staff.email,
        mobileNumber: staff.mobileNumber,
        passwordHash: staffPasswordHash,
        status: 'active',
      },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: staffRoles[staff.roleName].id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: staffRoles[staff.roleName].id,
      },
    });
  }

  const sampleCustomer = await prisma.customer.upsert({
    where: { accountNumber: 'CUST-0001' },
    update: {},
    create: {
      accountNumber: 'CUST-0001',
      customerType: 'residential',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      email: 'juan.delacruz@example.com',
      mobileNumber: '09171234567',
      status: 'active',
      createdByUserId: adminUser.id,
    },
  });

  const existingAddress = await prisma.customerAddress.findFirst({
    where: { customerId: sampleCustomer.id, addressType: 'installation' },
  });

  if (!existingAddress) {
    await prisma.customerAddress.create({
      data: {
        customerId: sampleCustomer.id,
        addressType: 'installation',
        street: '123 Fiber Street',
        barangay: 'Barangay Uno',
        municipality: 'Manila',
        province: 'Metro Manila',
        latitude: 14.5995,
        longitude: 120.9842,
      },
    });
  }

  const existingDocument = await prisma.customerDocument.findFirst({
    where: { customerId: sampleCustomer.id, documentType: 'Valid ID' },
  });

  if (!existingDocument) {
    await prisma.customerDocument.create({
      data: {
        customerId: sampleCustomer.id,
        documentType: 'Valid ID',
        filePath: '/uploads/customers/CUST-0001-valid-id-placeholder.pdf',
        uploadedByUserId: adminUser.id,
      },
    });
  }

  const metroManila = await prisma.province.upsert({
    where: { name: 'Metro Manila' },
    update: {},
    create: { name: 'Metro Manila', code: 'NCR' },
  });

  const manila = await prisma.municipality.upsert({
    where: {
      provinceId_name: {
        provinceId: metroManila.id,
        name: 'Manila',
      },
    },
    update: {},
    create: {
      provinceId: metroManila.id,
      name: 'Manila',
      code: 'NCR-MNL',
    },
  });

  const sampleBarangays = ['Barangay Uno', 'Barangay Dos', 'Barangay Tres'];
  for (const name of sampleBarangays) {
    await prisma.barangay.upsert({
      where: {
        municipalityId_name: {
          municipalityId: manila.id,
          name,
        },
      },
      update: {},
      create: {
        municipalityId: manila.id,
        name,
      },
    });
  }

  const samplePlans = [
    {
      code: 'FIBER-25',
      name: 'Fiber 25 Mbps',
      description: 'Residential starter plan',
      downloadMbps: 25,
      uploadMbps: 25,
      monthlyPrice: 699,
    },
    {
      code: 'FIBER-50',
      name: 'Fiber 50 Mbps',
      description: 'Residential standard plan',
      downloadMbps: 50,
      uploadMbps: 50,
      monthlyPrice: 999,
    },
    {
      code: 'FIBER-100',
      name: 'Fiber 100 Mbps',
      description: 'Residential premium plan',
      downloadMbps: 100,
      uploadMbps: 100,
      monthlyPrice: 1499,
    },
  ];

  for (const plan of samplePlans) {
    await prisma.servicePlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        downloadMbps: plan.downloadMbps,
        uploadMbps: plan.uploadMbps,
        monthlyPrice: plan.monthlyPrice,
        isActive: true,
        deletedAt: null,
      },
      create: plan,
    });
  }

  const inventoryCategories = [
    {
      code: 'FIBER-CABLE',
      name: 'Fiber Cable',
      description: 'Drop cable, patch cords, and fiber cable rolls',
    },
    {
      code: 'ONU-CPE',
      name: 'ONU / CPE',
      description: 'Subscriber optical network units and customer premises devices',
    },
    {
      code: 'NETWORK-EQUIP',
      name: 'Network Equipment',
      description: 'Routers, switches, OLT accessories, and active network equipment',
    },
    {
      code: 'TOOLS',
      name: 'Tools',
      description: 'Installation, splicing, testing, and maintenance tools',
    },
    {
      code: 'CONSUMABLES',
      name: 'Consumables',
      description: 'Connectors, sleeves, clamps, tapes, and small installation materials',
    },
  ];

  for (const category of inventoryCategories) {
    await prisma.inventoryCategory.upsert({
      where: { code: category.code },
      update: {
        name: category.name,
        description: category.description,
        isActive: true,
        deletedAt: null,
      },
      create: category,
    });
  }

  await prisma.warehouse.upsert({
    where: { code: 'MAIN' },
    update: {
      name: 'Main Warehouse',
      address: 'Main office stock room',
      contactPerson: 'Operations',
      contactNumber: null,
      isActive: true,
      deletedAt: null,
    },
    create: {
      code: 'MAIN',
      name: 'Main Warehouse',
      address: 'Main office stock room',
      contactPerson: 'Operations',
      isActive: true,
    },
  });

  const ticketCategories = [
    {
      code: 'NO-INTERNET',
      name: 'No Internet',
      description: 'Subscriber reports no connectivity or cannot browse',
    },
    {
      code: 'INTERMITTENT',
      name: 'Intermittent Connection',
      description: 'Connection drops, unstable browsing, or frequent reconnects',
    },
    {
      code: 'LOS',
      name: 'LOS / Fiber Fault',
      description: 'Loss of signal, fiber cut, or optical power issue',
    },
    {
      code: 'SLOW-SPEED',
      name: 'Slow Speed',
      description: 'Speed, latency, packet loss, or poor browsing performance',
    },
    {
      code: 'PPPOE-AUTH',
      name: 'PPPoE Authentication',
      description: 'Wrong password, disabled PPPoE account, or authentication failure',
    },
    {
      code: 'ROUTER-WIFI',
      name: 'Router / WiFi Concern',
      description: 'WiFi password, weak signal, router configuration, or CPE issue',
    },
    {
      code: 'RELOCATION',
      name: 'Relocation / Transfer',
      description: 'Customer requests transfer of service to another address',
    },
    {
      code: 'INSTALL-REPAIR',
      name: 'Installation Repair',
      description: 'Drop wire, connector, ONU, or installation-related repair',
    },
    {
      code: 'BILLING-CONCERN',
      name: 'Billing Concern',
      description: 'Billing questions, payment posting, or account balance concerns',
    },
    {
      code: 'PAYMENT-POSTING',
      name: 'Payment Posting',
      description: 'Payment validation, receipt checking, or account reconnection concern',
    },
    {
      code: 'PLAN-CHANGE',
      name: 'Plan Change',
      description: 'Upgrade, downgrade, or service plan profile change request',
    },
    {
      code: 'GENERAL-INQUIRY',
      name: 'General Inquiry',
      description: 'General subscriber request that does not fit another category',
    },
  ];

  for (const category of ticketCategories) {
    await prisma.ticketCategory.upsert({
      where: { code: category.code },
      update: {
        name: category.name,
        description: category.description,
        isActive: true,
        deletedAt: null,
      },
      create: category,
    });
  }

  const fiber50 = await prisma.servicePlan.findUniqueOrThrow({
    where: { code: 'FIBER-50' },
  });

  const mockRouters = await prisma.mikrotikRouter.findMany({
    where: {
      OR: [
        { host: '192.168.88.1', apiPort: 8728 },
        { name: 'NDTECH Core Router' },
      ],
    },
    select: { id: true },
  });

  for (const router of mockRouters) {
    const pppoeAccounts = await prisma.pppoeAccount.findMany({
      where: { routerId: router.id },
      select: { id: true },
    });
    const pppoeAccountIds = pppoeAccounts.map((account) => account.id);

    if (pppoeAccountIds.length) {
      await prisma.subscription.updateMany({
        where: { pppoeAccountId: { in: pppoeAccountIds } },
        data: { pppoeAccountId: null },
      });
      await prisma.pppoeSession.deleteMany({
        where: { routerId: router.id },
      });
      await prisma.pppoeAccount.deleteMany({
        where: { routerId: router.id },
      });
    }

    await prisma.mikrotikCommandLog.deleteMany({ where: { routerId: router.id } });
    await prisma.networkMonitoringTarget.deleteMany({
      where: { mikrotikRouterId: router.id },
    });
    await prisma.mikrotikRouter.delete({ where: { id: router.id } });
  }

  const existingSubscription = await prisma.subscription.findFirst({
    where: {
      customerId: sampleCustomer.id,
      status: 'active',
    },
  });

  if (!existingSubscription) {
    await prisma.subscription.create({
      data: {
        customerId: sampleCustomer.id,
        servicePlanId: fiber50.id,
        billingDay: 15,
        startDate: new Date('2026-01-15'),
        status: 'active',
        autoSuspendEnabled: true,
        gracePeriodDays: 7,
      },
    });
  }

  const expenseCategories = [
    ['Utilities', 'Electricity, water, and internet bills'],
    ['Fuel & Transportation', 'Fuel, vehicle maintenance, and travel costs'],
    ['Salaries & Wages', 'Staff payroll and contractor labor'],
    ['Rent & Facilities', 'Office rent, tower rent, and facility costs'],
    ['Office & Supplies', 'Office materials and consumables'],
    ['Repairs & Maintenance', 'Equipment and network maintenance'],
    ['Marketing', 'Advertising and promotional spending'],
    ['Professional Services', 'Legal, accounting, and consulting fees'],
    ['Other', 'Miscellaneous operating expenses'],
  ];

  for (const [name, description] of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { name },
      update: { description, isActive: true, deletedAt: null },
      create: { name, description, isActive: true },
    });
  }

  console.log(
    'Seed complete: admin, staff roles/users, customer, service plans, inventory/support foundations, subscriptions, and expense categories ready.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
