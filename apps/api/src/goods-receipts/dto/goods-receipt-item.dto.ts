import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class GoodsReceiptItemDto {
  @Type(() => Number)
  @IsInt()
  purchaseOrderItemId: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantityReceived: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
