import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CollectorSyncEventType } from '../collector-sync.constants';

export class CollectorSyncUploadEventDto {
  @IsUUID()
  localId: string;

  @IsEnum(CollectorSyncEventType)
  type: CollectorSyncEventType;

  @IsDateString()
  occurredAt: string;

  @IsObject()
  payload: Record<string, unknown>;
}

export class CollectorSyncUploadDto {
  @Type(() => Number)
  @IsInt()
  packageVersion: number;

  @IsString()
  deviceId: string;

  @IsDateString()
  uploadedAt: string;

  @IsOptional()
  @IsString()
  downloadChecksum?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CollectorSyncUploadEventDto)
  events: CollectorSyncUploadEventDto[];
}
