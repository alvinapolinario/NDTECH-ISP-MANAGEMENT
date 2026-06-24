import { TicketPriority, TicketStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  ticketNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subscriptionId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsString()
  reportedBy?: string | null;

  @IsOptional()
  @IsString()
  contactNumber?: string | null;

  @IsOptional()
  @IsString()
  location?: string | null;

  @IsOptional()
  @IsString()
  dueAt?: string | null;

  @IsOptional()
  @IsString()
  resolution?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
