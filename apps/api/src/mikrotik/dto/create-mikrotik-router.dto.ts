import { MikrotikRouterStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateMikrotikRouterDto {
  @IsString()
  name: string;

  @IsString()
  host: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  apiPort?: number;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsEnum(MikrotikRouterStatus)
  status?: MikrotikRouterStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
