import { PppoeAccountStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdatePppoeAccountDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  servicePlanId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  routerId?: number;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  profileName?: string;

  @IsOptional()
  @IsString()
  remoteAddress?: string | null;

  @IsOptional()
  @IsEnum(PppoeAccountStatus)
  status?: PppoeAccountStatus;
}
