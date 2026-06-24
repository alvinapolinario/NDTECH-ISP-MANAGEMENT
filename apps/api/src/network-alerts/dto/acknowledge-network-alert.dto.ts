import { IsOptional, IsString } from 'class-validator';

export class AcknowledgeNetworkAlertDto {
  @IsOptional()
  @IsString()
  acknowledgedBy?: string;
}
