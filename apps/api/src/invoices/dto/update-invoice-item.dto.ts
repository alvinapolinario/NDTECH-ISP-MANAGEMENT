import { InvoiceItemType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateInvoiceItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  servicePlanId?: number | null;

  @IsEnum(InvoiceItemType)
  itemType: InvoiceItemType;

  @IsString()
  description: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  unitPrice: number;
}
