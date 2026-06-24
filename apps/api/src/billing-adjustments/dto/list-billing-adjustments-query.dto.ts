import {
  BillingAdjustmentStatus,
  BillingAdjustmentType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListBillingAdjustmentsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(BillingAdjustmentStatus)
  status?: BillingAdjustmentStatus;

  @IsOptional()
  @IsEnum(BillingAdjustmentType)
  adjustmentType?: BillingAdjustmentType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  invoiceId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;
}
