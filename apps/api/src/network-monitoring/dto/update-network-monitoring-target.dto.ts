import { NetworkMonitorDeviceType, NetworkMonitorMethod, NetworkMonitorStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateNetworkMonitoringTargetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(NetworkMonitorDeviceType)
  deviceType?: NetworkMonitorDeviceType;

  @IsOptional()
  @IsEnum(NetworkMonitorMethod)
  monitorMethod?: NetworkMonitorMethod;

  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  mikrotikRouterId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  oltDeviceId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  onuDeviceId?: number | null;

  @IsOptional()
  @IsString()
  snmpCommunity?: string | null;

  @IsOptional()
  @IsEnum(NetworkMonitorStatus)
  status?: NetworkMonitorStatus;

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
  lastCheckedAt?: string | null;

  @IsOptional()
  @IsString()
  location?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
