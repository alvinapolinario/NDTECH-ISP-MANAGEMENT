import { CollectionCaseStatus, CollectionPriority } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListCollectionCasesQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(CollectionCaseStatus)
  status?: CollectionCaseStatus;

  @IsOptional()
  @IsEnum(CollectionPriority)
  priority?: CollectionPriority;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  invoiceId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;
}
