import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateProjectBomDto } from './dto/create-project-bom.dto';
import { ListProjectBomsQueryDto } from './dto/list-project-boms-query.dto';
import { UpdateProjectBomDto } from './dto/update-project-bom.dto';
import { ProjectBomsService } from './project-boms.service';

@Controller('project-boms')
export class ProjectBomsController {
  constructor(private readonly projectBomsService: ProjectBomsService) {}

  @Post() create(@Body() dto: CreateProjectBomDto) { return this.projectBomsService.create(dto); }
  @Get() findAll(@Query() query: ListProjectBomsQueryDto) { return this.projectBomsService.findAll(query); }
  @Get(':id') findOne(@Param('id') id: string) { return this.projectBomsService.findOne(Number(id)); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateProjectBomDto) { return this.projectBomsService.update(Number(id), dto); }
  @Post(':id/approve') approve(@Param('id') id: string) { return this.projectBomsService.setStatus(Number(id), 'approved'); }
  @Post(':id/issue') issue(@Param('id') id: string) { return this.projectBomsService.setStatus(Number(id), 'issued'); }
  @Delete(':id') remove(@Param('id') id: string) { return this.projectBomsService.remove(Number(id)); }
}
