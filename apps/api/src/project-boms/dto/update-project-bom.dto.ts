import { ProjectBomStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ProjectBomItemDto } from './project-bom-item.dto';

export class UpdateProjectBomDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  projectId?: number;

  @IsOptional()
  @IsString()
  bomNumber?: string;

  @IsOptional()
  @IsEnum(ProjectBomStatus)
  status?: ProjectBomStatus;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectBomItemDto)
  items?: ProjectBomItemDto[];
}
