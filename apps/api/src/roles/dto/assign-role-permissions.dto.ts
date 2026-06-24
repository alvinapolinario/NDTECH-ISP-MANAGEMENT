import { IsArray, IsInt } from 'class-validator';

export class AssignRolePermissionsDto {
  @IsArray()
  @IsInt({ each: true })
  permissionIds: number[];
}
