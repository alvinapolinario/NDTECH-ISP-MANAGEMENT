import { SnmpVersion, SwitchDeviceStatus, SwitchVendor } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateSwitchDeviceDto {
  @IsString()
  name: string;

  @IsEnum(SwitchVendor)
  vendor: SwitchVendor;

  @IsOptional()
  @IsString()
  model?: string;

  @IsString()
  host: string;

  @IsOptional()
  @IsString()
  managementIp?: string;

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
  @IsEnum(SwitchDeviceStatus)
  status?: SwitchDeviceStatus;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
