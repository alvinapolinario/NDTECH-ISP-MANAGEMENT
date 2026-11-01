import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import {
  PaymentGatewayProvider,
  PaymentGatewayTransactionStatus,
} from '@prisma/client';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListGatewayTransactionsQueryDto extends ListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  invoiceId?: number;

  @IsOptional()
  @IsEnum(PaymentGatewayProvider)
  provider?: PaymentGatewayProvider;

  @IsOptional()
  @IsEnum(PaymentGatewayTransactionStatus)
  status?: PaymentGatewayTransactionStatus;
}
