import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { CustomerStatusDto, CustomerTypeDto } from './create-customer.dto';

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsEnum(CustomerTypeDto)
  customerType?: CustomerTypeDto;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  mobileNumber?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  birthDate?: string | null;

  @IsOptional()
  @IsEnum(CustomerStatusDto)
  status?: CustomerStatusDto;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  referredByCustomerId?: number | null;
}
