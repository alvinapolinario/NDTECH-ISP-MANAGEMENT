import { PppoeAccountStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class CreatePppoeAccountDto {
  @Type(() => Number)
  @IsInt()
  customerId: number;

  @Type(() => Number)
  @IsInt()
  servicePlanId: number;

  @Type(() => Number)
  @IsInt()
  routerId: number;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsString()
  profileName: string;

  @IsOptional()
  @IsString()
  remoteAddress?: string;

  @IsOptional()
  @IsEnum(PppoeAccountStatus)
  status?: PppoeAccountStatus;
}
