import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDocumentDto {
  @IsString()
  documentType: string;

  @IsString()
  filePath: string;

  @IsOptional()
  @IsInt()
  uploadedByUserId?: number;
}
