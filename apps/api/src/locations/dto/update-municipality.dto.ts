import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateMunicipalityDto {
  @IsOptional()
  @IsInt()
  provinceId?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;
}
