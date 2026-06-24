import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class SendSmsDto {
  @IsString()
  @MinLength(10)
  number: string;

  @IsString()
  @MinLength(1)
  message: string;

  @IsOptional()
  @IsString()
  senderName?: string;

  @IsOptional()
  @IsInt()
  customerId?: number;

  @IsOptional()
  @IsString()
  notificationType?: string;
}
