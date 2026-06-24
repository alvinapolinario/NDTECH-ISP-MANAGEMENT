import { OnuDeviceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateOnuDeviceDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  oltDeviceId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subscriptionId?: number | null;

  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  macAddress?: string | null;

  @IsOptional()
  @IsString()
  ponPort?: string;

  @IsOptional()
  @IsString()
  onuId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  vlan?: number | null;

  @IsOptional()
  @IsString()
  profileName?: string | null;

  @IsOptional()
  @IsEnum(OnuDeviceStatus)
  status?: OnuDeviceStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rxPower?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  txPower?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  distanceMeters?: number | null;

  @IsOptional()
  @IsString()
  lastRegisteredAt?: string | null;

  @IsOptional()
  @IsString()
  lastDeregisteredAt?: string | null;

  @IsOptional()
  @IsString()
  lastDeregisteredReason?: string | null;

  @IsOptional()
  @IsString()
  location?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
