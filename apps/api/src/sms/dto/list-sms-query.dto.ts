import { ListQueryDto } from '../../common/dto/list-query.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { SmsMessageStatus } from '@prisma/client';

export class ListSmsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(SmsMessageStatus)
  status?: SmsMessageStatus;
}
