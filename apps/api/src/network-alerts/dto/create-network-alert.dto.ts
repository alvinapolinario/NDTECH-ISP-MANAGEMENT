import { NetworkAlertSeverity, NetworkAlertSource, NetworkAlertStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateNetworkAlertDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  targetId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  checkId?: number;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(NetworkAlertSeverity)
  severity?: NetworkAlertSeverity;

  @IsOptional()
  @IsEnum(NetworkAlertStatus)
  status?: NetworkAlertStatus;

  @IsOptional()
  @IsEnum(NetworkAlertSource)
  source?: NetworkAlertSource;

  @IsOptional()
  @IsString()
  metric?: string;

  @IsOptional()
  @IsString()
  threshold?: string;

  @IsOptional()
  @IsString()
  observedValue?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  occurredAt?: string;
}
