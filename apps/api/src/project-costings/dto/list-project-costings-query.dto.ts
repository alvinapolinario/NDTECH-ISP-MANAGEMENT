import { ProjectCostingStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListProjectCostingsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(ProjectCostingStatus)
  status?: ProjectCostingStatus;
}
