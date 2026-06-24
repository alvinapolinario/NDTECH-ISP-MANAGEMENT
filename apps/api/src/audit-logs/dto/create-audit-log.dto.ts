import { IsInt, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateAuditLogDto {
  @IsOptional()
  @IsInt()
  userId?: number;

  @IsString()
  action: string;

  @IsString()
  module: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsObject()
  oldValue?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  newValue?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  ipAddress?: string;
}
