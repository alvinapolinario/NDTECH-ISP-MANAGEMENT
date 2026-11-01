import { OltDeviceStatus, OltPonTechnology, SnmpVersion } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateOltDeviceDto {
  @IsString()
  name: string;

  @IsString()
  vendor: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsString()
  host: string;

  @IsOptional()
  @IsString()
  managementIp?: string;

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
  snmpCommunity?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  snmpPort?: number;

  @IsOptional()
  @IsEnum(OltDeviceStatus)
  status?: OltDeviceStatus;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
