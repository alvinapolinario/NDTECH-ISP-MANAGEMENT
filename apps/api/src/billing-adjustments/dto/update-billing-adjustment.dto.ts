import {
  BillingAdjustmentStatus,
  BillingAdjustmentType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateBillingAdjustmentDto {
  @IsOptional()
  @IsEnum(BillingAdjustmentType)
  adjustmentType?: BillingAdjustmentType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  adjustmentDate?: string;

  @IsOptional()
  @IsEnum(BillingAdjustmentStatus)
  status?: BillingAdjustmentStatus;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assignedFinanceUserId?: number | null;
}
