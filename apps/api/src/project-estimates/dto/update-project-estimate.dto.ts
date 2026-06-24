import { ProjectEstimateStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { ProjectEstimateItemDto } from './project-estimate-item.dto';

export class UpdateProjectEstimateDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  projectId?: number;

  @IsOptional()
  @IsString()
  estimateNumber?: string;

  @IsOptional()
  @IsEnum(ProjectEstimateStatus)
  status?: ProjectEstimateStatus;

  @IsOptional()
  @IsString()
  validUntil?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  laborCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overheadCost?: number;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectEstimateItemDto)
  items?: ProjectEstimateItemDto[];
}
