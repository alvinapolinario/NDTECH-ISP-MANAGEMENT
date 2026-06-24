import { InventoryAdjustmentType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListInventoryAdjustmentsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(InventoryAdjustmentType)
  adjustmentType?: InventoryAdjustmentType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  itemId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  warehouseId?: number;
}
