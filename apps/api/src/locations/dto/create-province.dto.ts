import { IsOptional, IsString } from 'class-validator';

export class CreateProvinceDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;
}
