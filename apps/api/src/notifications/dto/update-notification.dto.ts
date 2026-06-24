import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { NotificationChannelDto } from './create-notification.dto';

export class UpdateNotificationDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  notificationType?: string;

  @IsOptional()
  @IsEnum(NotificationChannelDto)
  channel?: NotificationChannelDto;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}
