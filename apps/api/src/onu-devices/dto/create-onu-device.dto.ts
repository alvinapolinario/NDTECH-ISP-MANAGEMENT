import { OnuDeviceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateOnuDeviceDto {
  @Type(() => Number)
  @IsInt()
  oltDeviceId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subscriptionId?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  serialNumber: string;

  @IsOptional()
  @IsString()
  macAddress?: string;

  @IsString()
  ponPort: string;

  @IsString()
  onuId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  vlan?: number;

  @IsOptional()
  @IsString()
  profileName?: string;

  @IsOptional()
  @IsEnum(OnuDeviceStatus)
  status?: OnuDeviceStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rxPower?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  txPower?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  distanceMeters?: number;

  @IsOptional()
  @IsString()
  lastRegisteredAt?: string;

  @IsOptional()
  @IsString()
  lastDeregisteredAt?: string;

  @IsOptional()
  @IsString()
  lastDeregisteredReason?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
