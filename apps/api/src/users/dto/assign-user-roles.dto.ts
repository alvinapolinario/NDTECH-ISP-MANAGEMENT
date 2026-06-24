import { IsArray, IsInt } from 'class-validator';

export class AssignUserRolesDto {
  @IsArray()
  @IsInt({ each: true })
  roleIds: number[];
}
