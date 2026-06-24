import { TechnicianAssignmentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateTechnicianAssignmentDto {
  @Type(() => Number)
  @IsInt()
  ticketId: number;

  @Type(() => Number)
  @IsInt()
  technicianId: number;

  @IsOptional()
  @IsEnum(TechnicianAssignmentStatus)
  status?: TechnicianAssignmentStatus;

  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
