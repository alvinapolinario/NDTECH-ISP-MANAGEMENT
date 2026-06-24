import { BillingAdjustmentType } from '@prisma/client';
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

export class CreateBillingAdjustmentDto {
  @Type(() => Number)
  @IsInt()
  invoiceId: number;

  @IsEnum(BillingAdjustmentType)
  adjustmentType: BillingAdjustmentType;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  reason: string;

  @IsDateString()
  adjustmentDate: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assignedFinanceUserId?: number | null;
}
