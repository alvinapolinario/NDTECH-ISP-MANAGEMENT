import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ProjectMaterialUsageItemDto } from './project-material-usage-item.dto';

export class CreateProjectMaterialUsageDto {
  @Type(() => Number)
  @IsInt()
  projectId: number;

  @Type(() => Number)
  @IsInt()
  warehouseId: number;

  @IsOptional()
  @IsString()
  usageNumber?: string;

  @IsOptional()
  @IsString()
  usedDate?: string;

  @IsOptional()
  @IsString()
  usedBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectMaterialUsageItemDto)
  items: ProjectMaterialUsageItemDto[];
}
