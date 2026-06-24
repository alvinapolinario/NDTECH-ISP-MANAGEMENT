import { PurchaseRequestPriority, PurchaseRequestStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { PurchaseRequestItemDto } from './purchase-request-item.dto';

export class UpdatePurchaseRequestDto {
  @IsOptional()
  @IsString()
  requestNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  supplierId?: number | null;

  @IsOptional()
  @IsEnum(PurchaseRequestStatus)
  status?: PurchaseRequestStatus;

  @IsOptional()
  @IsEnum(PurchaseRequestPriority)
  priority?: PurchaseRequestPriority;

  @IsOptional()
  @IsString()
  requestedBy?: string | null;

  @IsOptional()
  @IsString()
  neededDate?: string | null;

  @IsOptional()
  @IsString()
  purpose?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  approvedBy?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  financeReviewerUserId?: number | null;

  @IsOptional()
  @IsString()
  rejectedReason?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseRequestItemDto)
  items?: PurchaseRequestItemDto[];
}
