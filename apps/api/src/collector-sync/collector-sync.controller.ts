import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CollectorSyncService } from './collector-sync.service';
import { CollectorSyncDownloadQueryDto } from './dto/collector-sync-download-query.dto';
import {
  CollectorSyncDaySummaryQueryDto,
  ListCollectorSyncEventsQueryDto,
} from './dto/collector-sync-query.dto';
import { ListCollectorPaymentUploadsQueryDto } from './dto/collector-payment-uploads-query.dto';
import { CollectorSyncUploadDto } from './dto/collector-sync-upload-batch.dto';

@Controller('collector-sync')
export class CollectorSyncController {
  constructor(private readonly collectorSyncService: CollectorSyncService) {}

  @Get('download')
  download(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CollectorSyncDownloadQueryDto,
  ) {
    return this.collectorSyncService.download(user, query);
  }

  @Post('upload')
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CollectorSyncUploadDto,
  ) {
    return this.collectorSyncService.upload(user, dto);
  }

  @Get('payment-uploads')
  listPaymentUploads(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCollectorPaymentUploadsQueryDto,
  ) {
    return this.collectorSyncService.listPaymentUploads(user, query);
  }

  @Get('payment-uploads/summary')
  paymentUploadsSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCollectorPaymentUploadsQueryDto,
  ) {
    return this.collectorSyncService.paymentUploadsSummary(user, query);
  }

  @Get('events')
  listEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCollectorSyncEventsQueryDto,
  ) {
    return this.collectorSyncService.listEvents(user, query);
  }

  @Get('day-summary')
  daySummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CollectorSyncDaySummaryQueryDto,
  ) {
    return this.collectorSyncService.daySummary(user, query);
  }
}
