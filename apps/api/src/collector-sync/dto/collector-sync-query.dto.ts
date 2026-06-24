import { CollectorMobileEventStatus, CollectorMobileEventType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListCollectorSyncEventsQueryDto extends ListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  collectorUserId?: number;

  @IsOptional()
  @IsEnum(CollectorMobileEventType)
  eventType?: CollectorMobileEventType;

  @IsOptional()
  @IsEnum(CollectorMobileEventStatus)
  resultStatus?: CollectorMobileEventStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class CollectorSyncDaySummaryQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  collectorUserId?: number;
}
