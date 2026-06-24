import { ProjectBomStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListProjectBomsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(ProjectBomStatus)
  status?: ProjectBomStatus;
}
