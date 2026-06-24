import { CollectionCaseStatus, PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CollectorVisitOutcome } from '../collector-sync.constants';

export class CollectorSyncPaymentPayloadDto {
  @Type(() => Number)
  @IsInt()
  invoiceId: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  paymentDate: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  localReceiptNumber?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CollectorSyncCollectionUpdatePayloadDto {
  @Type(() => Number)
  @IsInt()
  invoiceId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  collectionCaseId?: number;

  @IsEnum(CollectionCaseStatus)
  status: CollectionCaseStatus;

  @IsOptional()
  @IsDateString()
  lastContactedAt?: string | null;

  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string | null;

  @IsOptional()
  @IsDateString()
  promiseToPayDate?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class CollectorSyncVisitNotePayloadDto {
  @Type(() => Number)
  @IsInt()
  invoiceId: number;

  @IsEnum(CollectorVisitOutcome)
  visitOutcome: CollectorVisitOutcome;

  @IsDateString()
  visitedAt: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}
