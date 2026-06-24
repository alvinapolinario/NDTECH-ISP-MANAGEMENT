import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { GoodsReceiptItemDto } from './goods-receipt-item.dto';

export class CreateGoodsReceiptDto {
  @IsOptional()
  @IsString()
  receiptNumber?: string;

  @Type(() => Number)
  @IsInt()
  purchaseOrderId: number;

  @Type(() => Number)
  @IsInt()
  warehouseId: number;

  @IsOptional()
  @IsString()
  receivedDate?: string;

  @IsOptional()
  @IsString()
  receivedBy?: string;

  @IsOptional()
  @IsString()
  deliveryReceiptNo?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptItemDto)
  items: GoodsReceiptItemDto[];
}
