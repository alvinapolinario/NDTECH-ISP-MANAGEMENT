import { NetworkMonitorDeviceType, NetworkMonitorStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListNetworkMonitoringTargetsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(NetworkMonitorStatus)
  status?: NetworkMonitorStatus;

  @IsOptional()
  @IsEnum(NetworkMonitorDeviceType)
  deviceType?: NetworkMonitorDeviceType;
}
