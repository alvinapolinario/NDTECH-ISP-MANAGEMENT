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
  ValidateIf,
} from 'class-validator';

export class UpdateSubscriptionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  servicePlanId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pppoeAccountId?: number | null;

  @IsOptional()
  @IsString()
  radiusUsername?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string | null;

  /** Negotiated monthly fee; null clears override and returns to plan catalog price. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monthlyAmount?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  billingDay?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

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
