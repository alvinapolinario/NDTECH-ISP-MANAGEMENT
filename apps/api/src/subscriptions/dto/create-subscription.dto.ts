import { SubscriptionStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
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

  @IsOptional()
  @IsString()
  radiusUsername?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  /** Negotiated monthly fee; omit to bill the service plan catalog price. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monthlyAmount?: number;

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
