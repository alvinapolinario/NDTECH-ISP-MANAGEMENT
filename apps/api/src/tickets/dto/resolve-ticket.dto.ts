import { IsOptional, IsString } from 'class-validator';

export class ResolveTicketDto {
  @IsOptional()
  @IsString()
  resolution?: string;
}
