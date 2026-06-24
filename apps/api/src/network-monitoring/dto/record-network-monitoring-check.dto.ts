import { NetworkMonitorStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RecordNetworkMonitoringCheckDto {
  @IsEnum(NetworkMonitorStatus)
  status: NetworkMonitorStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latencyMs?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  packetLossPercent?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  uptimeSeconds?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cpuUsagePercent?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  memoryUsagePercent?: number | null;

  @IsOptional()
  @IsString()
  interfaceStatus?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  interfaceErrors?: number | null;

  @IsOptional()
  @IsString()
  checkedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
