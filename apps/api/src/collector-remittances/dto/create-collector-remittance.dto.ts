import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCollectorRemittanceDto {
  @Type(() => Number)
  @IsInt()
  collectorUserId: number;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cashReceivedAmount: number;

  @IsOptional()
  @IsDateString()
  remittanceDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
