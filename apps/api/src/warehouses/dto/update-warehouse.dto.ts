import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateWarehouseDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsString()
  contactPerson?: string | null;

  @IsOptional()
  @IsString()
  contactNumber?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
