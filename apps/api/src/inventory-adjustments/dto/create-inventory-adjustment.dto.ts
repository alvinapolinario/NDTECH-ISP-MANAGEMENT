import { InventoryAdjustmentType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateInventoryAdjustmentDto {
  @Type(() => Number)
  @IsInt()
  itemId: number;

  @Type(() => Number)
  @IsInt()
  warehouseId: number;

  @IsEnum(InventoryAdjustmentType)
  adjustmentType: InventoryAdjustmentType;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
