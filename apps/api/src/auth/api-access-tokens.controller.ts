import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiAccessTokenService } from './api-access-token.service';
import {
  CurrentUser,
  type AuthenticatedUser,
} from './current-user.decorator';
import { CreateAdminApiTokenDto } from './dto/create-admin-api-token.dto';
import { ListApiTokensQueryDto } from './dto/list-api-tokens-query.dto';

@Controller('api-access-tokens')
export class ApiAccessTokensController {
  constructor(private readonly apiAccessTokens: ApiAccessTokenService) {}

  @Get()
  list(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ListApiTokensQueryDto,
  ) {
    return this.apiAccessTokens.listForAdmin(actor, query);
  }

  @Post()
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateAdminApiTokenDto,
  ) {
    return this.apiAccessTokens.issueForCollectorUser(actor, {
      userId: dto.userId,
      label: dto.label,
      deviceId: dto.deviceId,
    });
  }

  @Post(':id/revoke')
  revoke(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.apiAccessTokens.revokeForAdmin(actor, Number(id));
  }
}
