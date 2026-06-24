import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateInstallationRequestDto } from './dto/create-installation-request.dto';
import { ListInstallationRequestsQueryDto } from './dto/list-installation-requests-query.dto';
import { UpdateInstallationRequestDto } from './dto/update-installation-request.dto';
import { InstallationRequestsService } from './installation-requests.service';

@Controller('installation-requests')
export class InstallationRequestsController {
  constructor(
    private readonly installationRequestsService: InstallationRequestsService,
  ) {}

  @Post()
  create(@Body() dto: CreateInstallationRequestDto) {
    return this.installationRequestsService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListInstallationRequestsQueryDto) {
    return this.installationRequestsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.installationRequestsService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInstallationRequestDto) {
    return this.installationRequestsService.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.installationRequestsService.remove(Number(id));
  }
}
