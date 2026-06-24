import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum CollectorSyncScope {
  all_collectible = 'all_collectible',
  assigned = 'assigned',
}

export class CollectorSyncDownloadQueryDto {
  @IsOptional()
  @IsEnum(CollectorSyncScope)
  scope?: CollectorSyncScope;

  @IsOptional()
  @IsDateString()
  since?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  billingCycleId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  barangayId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
