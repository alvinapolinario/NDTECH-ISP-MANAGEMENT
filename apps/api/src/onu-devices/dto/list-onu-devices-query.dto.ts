import { OnuDeviceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListOnuDevicesQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(OnuDeviceStatus)
  status?: OnuDeviceStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  oltDeviceId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subscriptionId?: number;
}
