import { IsOptional, IsString } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  module: string;

  @IsString()
  action: string;

  @IsOptional()
  @IsString()
  description?: string;
}
