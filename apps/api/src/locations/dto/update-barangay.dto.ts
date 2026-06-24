import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateBarangayDto {
  @IsOptional()
  @IsInt()
  municipalityId?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;
}
