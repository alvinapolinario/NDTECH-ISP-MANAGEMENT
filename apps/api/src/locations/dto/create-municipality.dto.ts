import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateMunicipalityDto {
  @IsInt()
  provinceId: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;
}
