import { NetworkMonitorDeviceType, NetworkMonitorMethod, NetworkMonitorStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateNetworkMonitoringTargetDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(NetworkMonitorDeviceType)
  deviceType?: NetworkMonitorDeviceType;

  @IsOptional()
  @IsEnum(NetworkMonitorMethod)
  monitorMethod?: NetworkMonitorMethod;

  @IsString()
  host: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  mikrotikRouterId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  oltDeviceId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  onuDeviceId?: number;

  @IsOptional()
  @IsString()
  snmpCommunity?: string;

  @IsOptional()
  @IsEnum(NetworkMonitorStatus)
  status?: NetworkMonitorStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latencyMs?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  packetLossPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  uptimeSeconds?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cpuUsagePercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  memoryUsagePercent?: number;

  @IsOptional()
  @IsString()
  interfaceStatus?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  interfaceErrors?: number;

  @IsOptional()
  @IsString()
  lastCheckedAt?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
