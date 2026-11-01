import { IsString, MinLength } from 'class-validator';

export class LookupTr069BySerialQueryDto {
  @IsString()
  @MinLength(1)
  serial!: string;
}
