import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateBarangayDto {
  @IsInt()
  municipalityId: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;
}
