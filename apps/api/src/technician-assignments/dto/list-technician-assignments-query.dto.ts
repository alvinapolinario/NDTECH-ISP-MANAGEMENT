import { TechnicianAssignmentStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListTechnicianAssignmentsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(TechnicianAssignmentStatus)
  status?: TechnicianAssignmentStatus;
}
