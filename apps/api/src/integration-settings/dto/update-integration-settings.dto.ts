import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class IntegrationSettingValueDto {
  @IsString()
  key: string;

  @IsOptional()
  @IsString()
  value?: string;
}

export class UpdateIntegrationSettingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntegrationSettingValueDto)
  settings: IntegrationSettingValueDto[];
}
