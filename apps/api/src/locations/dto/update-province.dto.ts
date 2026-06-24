import { IsOptional, IsString } from 'class-validator';

export class UpdateProvinceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;
}
