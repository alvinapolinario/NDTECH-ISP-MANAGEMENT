import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAdminApiTokenDto {
  @IsInt()
  userId: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  label?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}
