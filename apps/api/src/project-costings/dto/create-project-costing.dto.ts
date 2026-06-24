import { ProjectCostingStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProjectCostingDto {
  @Type(() => Number)
  @IsInt()
  projectId: number;

  @IsOptional()
  @IsEnum(ProjectCostingStatus)
  status?: ProjectCostingStatus;

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
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherCost?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
