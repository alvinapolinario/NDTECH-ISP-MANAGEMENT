import { IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { CustomerAddressTypeDto } from './create-customer-address.dto';

export class UpdateCustomerAddressDto {
  @IsOptional()
  @IsInt()
  barangayId?: number;

  @IsOptional()
  @IsEnum(CustomerAddressTypeDto)
  addressType?: CustomerAddressTypeDto;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  barangay?: string;

  @IsOptional()
  @IsString()
  municipality?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
