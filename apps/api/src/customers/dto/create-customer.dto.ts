import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export enum CustomerTypeDto {
  residential = 'residential',
  business = 'business',
  government = 'government',
}

export enum CustomerStatusDto {
  lead = 'lead',
  prospect = 'prospect',
  active = 'active',
  suspended = 'suspended',
  disconnected = 'disconnected',
  terminated = 'terminated',
}

export class CreateCustomerDto {
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsEnum(CustomerTypeDto)
  customerType: CustomerTypeDto;

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

  @IsString()
  mobileNumber: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsEnum(CustomerStatusDto)
  status?: CustomerStatusDto;

  @IsOptional()
  @IsInt()
  referredByCustomerId?: number;

  @IsOptional()
  @IsInt()
  createdByUserId?: number;
}
