import { TechnicianAssignmentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateTechnicianAssignmentDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ticketId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  technicianId?: number;

  @IsOptional()
  @IsEnum(TechnicianAssignmentStatus)
  status?: TechnicianAssignmentStatus;

  @IsOptional()
  @IsString()
  scheduledAt?: string | null;

  @IsOptional()
  @IsString()
  startedAt?: string | null;

  @IsOptional()
  @IsString()
  completedAt?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  completionNotes?: string | null;
}
