import {
  InstallationRequestPriority,
  InstallationRequestStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateInstallationRequestDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  servicePlanId?: number | null;

  @IsOptional()
  @IsEnum(InstallationRequestStatus)
  status?: InstallationRequestStatus;

  @IsOptional()
  @IsEnum(InstallationRequestPriority)
  priority?: InstallationRequestPriority;

  @IsOptional()
  @IsDateString()
  requestedDate?: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string | null;

  @IsOptional()
  @IsDateString()
  completedAt?: string | null;

  @IsOptional()
  @IsString()
  assignedInstallerName?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assignedInstallerUserId?: number | null;

  @IsOptional()
  @IsString()
  contactNumber?: string | null;

  @IsOptional()
  @IsString()
  installationAddress?: string;

  @IsOptional()
  @IsString()
  mapLocation?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
