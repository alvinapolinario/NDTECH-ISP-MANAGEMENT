import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export enum NotificationChannelDto {
  system = 'system',
  sms = 'sms',
  email = 'email',
  socket = 'socket',
}

export class CreateNotificationDto {
  @IsOptional()
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsInt()
  customerId?: number;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsString()
  notificationType: string;

  @IsOptional()
  @IsEnum(NotificationChannelDto)
  channel?: NotificationChannelDto;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}
