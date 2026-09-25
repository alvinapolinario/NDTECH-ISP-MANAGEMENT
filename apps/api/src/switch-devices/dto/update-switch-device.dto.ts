import { SnmpVersion, SwitchDeviceStatus, SwitchVendor } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSwitchDeviceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(SwitchVendor)
  vendor?: SwitchVendor;

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
  @IsEnum(SnmpVersion)
  snmpVersion?: SnmpVersion;

  @IsOptional()
  @IsString()
  snmpCommunity?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  snmpPort?: number;

  @IsOptional()
  @IsEnum(SwitchDeviceStatus)
  status?: SwitchDeviceStatus;

  @IsOptional()
  @IsString()
  location?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
