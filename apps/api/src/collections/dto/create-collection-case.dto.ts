import { CollectionCaseStatus, CollectionPriority } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateCollectionCaseDto {
  @Type(() => Number)
  @IsInt()
  invoiceId: number;

  @IsOptional()
  @IsEnum(CollectionCaseStatus)
  status?: CollectionCaseStatus;

  @IsOptional()
  @IsEnum(CollectionPriority)
  priority?: CollectionPriority;

  @IsOptional()
  @IsString()
  assignedCollector?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assignedCollectorUserId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assignedFinanceUserId?: number | null;

  @IsOptional()
  @IsDateString()
  lastContactedAt?: string;

  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;

  @IsOptional()
  @IsDateString()
  promiseToPayDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
