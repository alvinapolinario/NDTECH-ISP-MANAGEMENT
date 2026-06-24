import { IsBoolean, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateServicePlanDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  downloadMbps?: number;

  @IsOptional()
  @IsInt()
  uploadMbps?: number;

  @IsOptional()
  @IsNumber()
  monthlyPrice?: number;

  @IsOptional()
  @IsString()
  pppoeProfileName?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
