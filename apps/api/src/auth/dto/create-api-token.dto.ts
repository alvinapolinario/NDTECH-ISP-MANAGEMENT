import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateApiTokenDto {
  @IsString()
  @MinLength(3)
  email: string;

  @IsString()
  @MinLength(1)
  password: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}
