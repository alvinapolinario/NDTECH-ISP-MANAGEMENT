import { IsString, MinLength } from 'class-validator';

export class ChangeOnuWifiPasswordDto {
  @IsString()
  @MinLength(8)
  password!: string;
}
