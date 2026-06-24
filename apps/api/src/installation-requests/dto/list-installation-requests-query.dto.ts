import {
  InstallationRequestPriority,
  InstallationRequestStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListInstallationRequestsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(InstallationRequestStatus)
  status?: InstallationRequestStatus;

  @IsOptional()
  @IsEnum(InstallationRequestPriority)
  priority?: InstallationRequestPriority;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;
}
