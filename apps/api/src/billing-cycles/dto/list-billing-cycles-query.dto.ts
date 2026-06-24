import { BillingCycleStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListBillingCyclesQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(BillingCycleStatus)
  status?: BillingCycleStatus;
}
