import { IsOptional, IsString } from 'class-validator';

export class CompleteTechnicianAssignmentDto {
  @IsOptional()
  @IsString()
  completionNotes?: string;
}
