import { IsOptional, IsString, MinLength } from 'class-validator';

export class SendCustomerSmsDto {
  @IsString()
  @MinLength(1)
  message: string;

  @IsOptional()
  @IsString()
  senderName?: string;

  @IsOptional()
  @IsString()
  notificationType?: string;
}
