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

export class CreateInstallationRequestDto {
  @Type(() => Number)
  @IsInt()
  customerId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  servicePlanId?: number;

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
  scheduledDate?: string;

  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @IsOptional()
  @IsString()
  assignedInstallerName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assignedInstallerUserId?: number | null;

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsString()
  installationAddress: string;

  @IsOptional()
  @IsString()
  mapLocation?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
