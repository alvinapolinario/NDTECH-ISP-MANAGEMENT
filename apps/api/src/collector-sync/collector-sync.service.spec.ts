import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CollectorSyncService } from './collector-sync.service';
import { PrismaService } from '../prisma/prisma.service';
import { PppoeAccountsService } from '../mikrotik/pppoe-accounts.service';

describe('CollectorSyncService', () => {
  let service: CollectorSyncService;

  const prisma = {
    user: { findFirst: jest.fn() },
    collectorMobileEvent: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    payment: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };

  const pppoeAccountsService = {
    restoreAfterPayment: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectorSyncService,
        { provide: PrismaService, useValue: prisma },
        { provide: PppoeAccountsService, useValue: pppoeAccountsService },
      ],
    }).compile();

    service = module.get(CollectorSyncService);
  });

  it('rejects non-admin users filtering another collector sync history', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 5,
      name: 'Collector',
      email: 'collector@test.local',
      mobileNumber: '09170000000',
    });

    await expect(
      service.listEvents(
        {
          id: 5,
          name: 'Collector',
          email: 'collector@test.local',
          status: 'active',
          roles: [{ id: 2, name: 'Collector' }],
        },
        { collectorUserId: 9 },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
