import { IsBoolean, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateServicePlanDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  downloadMbps: number;

  @IsInt()
  uploadMbps: number;

  @IsNumber()
  monthlyPrice: number;

  @IsOptional()
  @IsString()
  pppoeProfileName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
