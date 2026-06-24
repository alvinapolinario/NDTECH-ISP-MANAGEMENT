import { OltDeviceStatus, OltPonTechnology } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListOltDevicesQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(OltDeviceStatus)
  status?: OltDeviceStatus;

  @IsOptional()
  @IsEnum(OltPonTechnology)
  ponTechnology?: OltPonTechnology;
}
