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
import { ListQueryDto } from '../common/dto/list-query.dto';
import { CreateMikrotikRouterDto } from './dto/create-mikrotik-router.dto';
import { UpdateMikrotikRouterDto } from './dto/update-mikrotik-router.dto';
import { MikrotikRoutersService } from './mikrotik-routers.service';

@Controller('mikrotik-routers')
export class MikrotikRoutersController {
  constructor(private readonly routersService: MikrotikRoutersService) {}

  @Post()
  create(@Body() dto: CreateMikrotikRouterDto) {
    return this.routersService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListQueryDto) {
    return this.routersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.routersService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMikrotikRouterDto) {
    return this.routersService.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.routersService.remove(Number(id));
  }

  @Post(':id/test-connection')
  testConnection(@Param('id') id: string) {
    return this.routersService.testConnection(Number(id));
  }

  @Post(':id/sync-pppoe-accounts')
  syncPppoeAccounts(@Param('id') id: string) {
    return this.routersService.syncPppoeAccounts(Number(id));
  }

  @Get(':id/ppp-profiles')
  listPppoeProfiles(@Param('id') id: string) {
    return this.routersService.listPppoeProfiles(Number(id));
  }
}
