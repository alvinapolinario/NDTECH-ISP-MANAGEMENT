import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, SmsMessageStatus } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { IntegrationSettingsService } from '../integration-settings/integration-settings.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  isValidPhilippineMobileNumber,
  normalizePhilippineMobileNumber,
} from './phone.util';
import { SemaphoreClient } from './semaphore.client';
import { ListSmsQueryDto } from './dto/list-sms-query.dto';
import { SendSmsDto } from './dto/send-sms.dto';
import { SendCustomerSmsDto } from './dto/send-customer-sms.dto';

type SendSmsOptions = {
  number: string;
  message: string;
  senderName?: string;
  customerId?: number;
  sentByUserId?: number;
  notificationType?: string;
};

@Injectable()
export class SmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationSettings: IntegrationSettingsService,
  ) {}

  async isConfigured() {
    const config = await this.integrationSettings.getSmsConfig();
    return Boolean(config.apiKey);
  }

  async getAccount() {
    const client = await this.resolveClient();
    return client.getAccount();
  }

  async send(dto: SendSmsDto, sentByUserId?: number) {
    return this.sendInternal(
      {
        number: dto.number,
        message: dto.message,
        senderName: dto.senderName,
        customerId: dto.customerId,
        sentByUserId,
        notificationType: dto.notificationType,
      },
      sentByUserId,
    );
  }

  async sendToCustomer(
    customerId: number,
    dto: SendCustomerSmsDto,
    sentByUserId?: number,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      select: { id: true, mobileNumber: true },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    return this.sendInternal(
      {
        number: customer.mobileNumber,
        message: dto.message,
        senderName: dto.senderName,
        customerId: customer.id,
        sentByUserId,
        notificationType: dto.notificationType,
      },
      sentByUserId,
    );
  }

  async dispatchNotificationSms(params: {
    title: string;
    message: string;
    notificationType: string;
    userId?: number;
    customerId?: number;
    sentByUserId?: number;
  }) {
    const number = await this.resolveRecipientNumber(params);
    const body = params.title
      ? `${params.title}\n${params.message}`.trim()
      : params.message;

    return this.sendInternal(
      {
        number,
        message: body,
        customerId: params.customerId,
        sentByUserId: params.sentByUserId,
        notificationType: params.notificationType,
      },
      params.sentByUserId,
    );
  }

  async findAll(query: ListSmsQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const where: Prisma.SmsMessageWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { recipient: { contains: query.search } },
              { message: { contains: query.search } },
              { notificationType: { contains: query.search } },
              { customer: { accountNumber: { contains: query.search } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.smsMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              accountNumber: true,
              firstName: true,
              lastName: true,
              businessName: true,
            },
          },
          sentBy: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.smsMessage.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const message = await this.prisma.smsMessage.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            accountNumber: true,
            firstName: true,
            lastName: true,
            businessName: true,
          },
        },
        sentBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!message) {
      throw new BadRequestException('SMS message not found');
    }

    return message;
  }

  private async resolveClient() {
    const config = await this.integrationSettings.getSmsConfig();

    if (!config.apiKey) {
      throw new ServiceUnavailableException(
        'Semaphore API key is not configured',
      );
    }

    return new SemaphoreClient(config.apiKey, config.senderName || undefined);
  }

  private async sendInternal(options: SendSmsOptions, sentByUserId?: number) {
    const smsConfig = await this.integrationSettings.getSmsConfig();
    const recipient = normalizePhilippineMobileNumber(options.number);

    if (!isValidPhilippineMobileNumber(recipient)) {
      throw new BadRequestException('Invalid Philippine mobile number');
    }

    const senderName = options.senderName ?? smsConfig.senderName;

    const log = await this.prisma.smsMessage.create({
      data: {
        recipient,
        message: options.message,
        senderName,
        status: SmsMessageStatus.queued,
        customerId: options.customerId,
        sentByUserId: sentByUserId ?? options.sentByUserId,
        notificationType: options.notificationType,
      },
    });

    if (!smsConfig.enabled) {
      return this.prisma.smsMessage.update({
        where: { id: log.id },
        data: {
          status: SmsMessageStatus.skipped,
          errorMessage: 'SMS sending is disabled in integration settings',
        },
      });
    }

    if (!smsConfig.apiKey) {
      await this.prisma.smsMessage.update({
        where: { id: log.id },
        data: {
          status: SmsMessageStatus.failed,
          errorMessage: 'Semaphore API key is not configured',
        },
      });
      throw new ServiceUnavailableException(
        'Semaphore API key is not configured',
      );
    }

    try {
      const client = await this.resolveClient();
      const responses = await client.sendMessage({
        number: recipient,
        message: options.message,
        senderName,
      });
      const response = responses[0];

      return this.prisma.smsMessage.update({
        where: { id: log.id },
        data: {
          status: SmsMessageStatus.sent,
          semaphoreMessageId: String(response.message_id),
          semaphoreStatus: response.status,
          network: response.network,
        },
        include: {
          customer: {
            select: {
              id: true,
              accountNumber: true,
              firstName: true,
              lastName: true,
              businessName: true,
            },
          },
          sentBy: { select: { id: true, name: true, email: true } },
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to send SMS';

      await this.prisma.smsMessage.update({
        where: { id: log.id },
        data: {
          status: SmsMessageStatus.failed,
          errorMessage: message,
        },
      });

      throw new ServiceUnavailableException(message);
    }
  }

  private async resolveRecipientNumber(params: {
    userId?: number;
    customerId?: number;
  }) {
    if (params.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: params.customerId, deletedAt: null },
        select: { mobileNumber: true },
      });

      if (!customer?.mobileNumber) {
        throw new BadRequestException('Customer mobile number is required');
      }

      return customer.mobileNumber;
    }

    if (params.userId) {
      const user = await this.prisma.user.findFirst({
        where: { id: params.userId, deletedAt: null },
        select: { mobileNumber: true },
      });

      if (!user?.mobileNumber) {
        throw new BadRequestException('User mobile number is required');
      }

      return user.mobileNumber;
    }

    throw new BadRequestException(
      'SMS notifications require customerId or userId with a mobile number',
    );
  }
}
