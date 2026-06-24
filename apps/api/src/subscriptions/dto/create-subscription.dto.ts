import { SubscriptionStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class CreateSubscriptionDto {
  @Type(() => Number)
  @IsInt()
  customerId: number;

  @Type(() => Number)
  @IsInt()
  servicePlanId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pppoeAccountId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  billingDay: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @IsOptional()
  @IsBoolean()
  autoSuspendEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  gracePeriodDays?: number;
}
