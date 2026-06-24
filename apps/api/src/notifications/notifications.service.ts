import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
  ) {}

  async create(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({ data: dto });

    if (dto.channel === NotificationChannel.sms) {
      await this.smsService.dispatchNotificationSms({
        title: dto.title,
        message: dto.message,
        notificationType: dto.notificationType,
        userId: dto.userId,
        customerId: dto.customerId,
      });
    }

    return notification;
  }

  async findAll(query: ListQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const where = {
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search } },
              { message: { contains: query.search } },
              { notificationType: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.filter ? { channel: query.filter as any } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async update(id: number, dto: UpdateNotificationDto) {
    await this.findOne(id);
    return this.prisma.notification.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.notification.delete({ where: { id } });
  }
}
