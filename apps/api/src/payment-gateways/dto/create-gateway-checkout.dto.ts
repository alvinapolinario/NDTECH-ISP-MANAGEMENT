import { IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentGatewayProvider } from '@prisma/client';

export class CreateGatewayCheckoutDto {
  @Type(() => Number)
  @IsInt()
  invoiceId!: number;

  @IsOptional()
  @IsEnum(PaymentGatewayProvider)
  provider?: PaymentGatewayProvider;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount?: number;
}
