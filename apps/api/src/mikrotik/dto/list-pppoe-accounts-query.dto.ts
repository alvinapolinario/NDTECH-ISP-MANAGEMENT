import { PppoeAccountStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListPppoeAccountsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(PppoeAccountStatus)
  status?: PppoeAccountStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  routerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;
}
