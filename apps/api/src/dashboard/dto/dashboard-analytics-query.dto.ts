import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class DashboardAnalyticsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  billingCycleId?: number;
}
