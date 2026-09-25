import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { CollectorRemittanceStatus } from '@prisma/client';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListCollectorRemittancesQueryDto extends ListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  collectorUserId?: number;

  @IsOptional()
  @IsEnum(CollectorRemittanceStatus)
  status?: CollectorRemittanceStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class PreviewCollectorRemittanceQueryDto {
  @Type(() => Number)
  @IsInt()
  collectorUserId: number;

  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}
