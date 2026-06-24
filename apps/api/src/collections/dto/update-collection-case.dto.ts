import { CollectionCaseStatus, CollectionPriority } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateCollectionCaseDto {
  @IsOptional()
  @IsEnum(CollectionCaseStatus)
  status?: CollectionCaseStatus;

  @IsOptional()
  @IsEnum(CollectionPriority)
  priority?: CollectionPriority;

  @IsOptional()
  @IsString()
  assignedCollector?: string | null;

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
  lastContactedAt?: string | null;

  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string | null;

  @IsOptional()
  @IsDateString()
  promiseToPayDate?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
