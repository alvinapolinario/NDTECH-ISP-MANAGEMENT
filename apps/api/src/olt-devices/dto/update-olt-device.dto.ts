import { OltDeviceStatus, OltPonTechnology, SnmpVersion } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateOltDeviceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsString()
  model?: string | null;

  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @IsString()
  managementIp?: string | null;

  @IsOptional()
  @IsEnum(OltPonTechnology)
  ponTechnology?: OltPonTechnology;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ponPortCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  uplinkPortCount?: number;

  @IsOptional()
  @IsEnum(SnmpVersion)
  snmpVersion?: SnmpVersion;

  @IsOptional()
  @IsString()
  snmpCommunity?: string | null;

  @IsOptional()
  @IsEnum(OltDeviceStatus)
  status?: OltDeviceStatus;

  @IsOptional()
  @IsString()
  location?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
