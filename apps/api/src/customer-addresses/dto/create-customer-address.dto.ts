import { IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export enum CustomerAddressTypeDto {
  billing = 'billing',
  installation = 'installation',
}

export class CreateCustomerAddressDto {
  @IsOptional()
  @IsInt()
  barangayId?: number;

  @IsEnum(CustomerAddressTypeDto)
  addressType: CustomerAddressTypeDto;

  @IsString()
  street: string;

  @IsString()
  barangay: string;

  @IsString()
  municipality: string;

  @IsString()
  province: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
