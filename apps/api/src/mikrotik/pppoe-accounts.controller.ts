import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreatePppoeAccountDto } from './dto/create-pppoe-account.dto';
import { LinkPppoeAccountSubscriptionDto } from './dto/link-pppoe-account-subscription.dto';
import { ListPppoeAccountsQueryDto } from './dto/list-pppoe-accounts-query.dto';
import { UpdatePppoeAccountDto } from './dto/update-pppoe-account.dto';
import { PppoeAccountsService } from './pppoe-accounts.service';

@Controller('pppoe-accounts')
export class PppoeAccountsController {
  constructor(private readonly accountsService: PppoeAccountsService) {}

  @Post()
  create(@Body() dto: CreatePppoeAccountDto) {
    return this.accountsService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListPppoeAccountsQueryDto) {
    return this.accountsService.findAll(query);
  }

  @Get(':id/radius-sessions')
  listRadiusSessions(@Param('id') id: string) {
    return this.accountsService.listRadiusSessions(Number(id));
  }

  @Post(':id/disconnect-session')
  disconnectRadiusSessions(@Param('id') id: string) {
    return this.accountsService.disconnectRadiusSessions(Number(id));
  }

  @Get(':id/action-logs')
  findActionLogs(@Param('id') id: string) {
    return this.accountsService.findActionLogs(Number(id));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountsService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePppoeAccountDto) {
    return this.accountsService.update(Number(id), dto);
  }

  @Post(':id/link-subscription')
  linkSubscription(
    @Param('id') id: string,
    @Body() dto: LinkPppoeAccountSubscriptionDto,
  ) {
    return this.accountsService.linkSubscription(Number(id), dto.subscriptionId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.accountsService.remove(Number(id));
  }

  @Post(':id/enable')
  enable(@Param('id') id: string) {
    return this.accountsService.enable(Number(id));
  }

  @Post(':id/disable')
  disable(@Param('id') id: string) {
    return this.accountsService.disable(Number(id));
  }

  @Post(':id/suspend')
  suspend(@Param('id') id: string) {
    return this.accountsService.suspend(Number(id));
  }
}
