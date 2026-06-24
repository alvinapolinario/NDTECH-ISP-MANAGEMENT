import { IsOptional, IsString } from 'class-validator';

export class ResolveNetworkAlertDto {
  @IsOptional()
  @IsString()
  resolvedBy?: string;

  @IsOptional()
  @IsString()
  resolution?: string;
}
