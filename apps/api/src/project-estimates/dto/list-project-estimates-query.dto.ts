import { ProjectEstimateStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListProjectEstimatesQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(ProjectEstimateStatus)
  status?: ProjectEstimateStatus;
}
