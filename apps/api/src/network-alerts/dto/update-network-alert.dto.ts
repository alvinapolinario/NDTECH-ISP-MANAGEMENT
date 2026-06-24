import { NetworkAlertSeverity, NetworkAlertSource, NetworkAlertStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateNetworkAlertDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  targetId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  checkId?: number | null;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

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
  metric?: string | null;

  @IsOptional()
  @IsString()
  threshold?: string | null;

  @IsOptional()
  @IsString()
  observedValue?: string | null;

  @IsOptional()
  @IsString()
  assignedTo?: string | null;

  @IsOptional()
  @IsString()
  acknowledgedBy?: string | null;

  @IsOptional()
  @IsString()
  acknowledgedAt?: string | null;

  @IsOptional()
  @IsString()
  resolvedBy?: string | null;

  @IsOptional()
  @IsString()
  resolvedAt?: string | null;

  @IsOptional()
  @IsString()
  resolution?: string | null;

  @IsOptional()
  @IsString()
  occurredAt?: string;
}
