import { SwitchDeviceStatus, SwitchVendor } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListSwitchDevicesQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(SwitchDeviceStatus)
  status?: SwitchDeviceStatus;

  @IsOptional()
  @IsEnum(SwitchVendor)
  vendor?: SwitchVendor;
}
