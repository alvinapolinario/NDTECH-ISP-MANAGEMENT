import { Injectable } from '@nestjs/common';
import { MikrotikCommandStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MikrotikCommandLoggerService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    routerId: number;
    commandType: string;
    commandPayload?: Record<string, unknown>;
    responseMessage?: string;
    status?: MikrotikCommandStatus;
  }) {
    return this.prisma.mikrotikCommandLog.create({
      data: {
        routerId: params.routerId,
        commandType: params.commandType,
        commandPayload: params.commandPayload as Prisma.InputJsonValue,
        responseMessage: params.responseMessage,
        status: params.status ?? MikrotikCommandStatus.mock_logged,
      },
    });
  }
}
