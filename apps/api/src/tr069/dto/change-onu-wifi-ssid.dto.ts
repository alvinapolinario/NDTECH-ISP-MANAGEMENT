import { IsOptional, IsString, MinLength } from 'class-validator';

export class ChangeOnuWifiSsidDto {
  @IsString()
  @MinLength(1)
  ssid!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  ssid5g?: string;
}
