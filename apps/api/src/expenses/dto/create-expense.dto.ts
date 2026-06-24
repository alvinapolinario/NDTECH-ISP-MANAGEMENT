import { PaymentMethod } from '@prisma/client';
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

export class CreateExpenseDto {
  @Type(() => Number)
  @IsInt()
  expenseCategoryId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  supplierId?: number | null;

  @IsDateString()
  expenseDate: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  payee: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  recordedByUserId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assignedFinanceUserId?: number | null;
}
