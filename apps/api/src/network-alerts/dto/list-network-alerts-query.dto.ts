import { NetworkAlertSeverity, NetworkAlertStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListNetworkAlertsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(NetworkAlertStatus)
  status?: NetworkAlertStatus;

  @IsOptional()
  @IsEnum(NetworkAlertSeverity)
  severity?: NetworkAlertSeverity;
}
