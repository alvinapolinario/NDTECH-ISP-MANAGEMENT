import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateProjectMaterialUsageDto } from './dto/create-project-material-usage.dto';
import { ListProjectMaterialUsagesQueryDto } from './dto/list-project-material-usages-query.dto';
import { ProjectMaterialUsagesService } from './project-material-usages.service';

@Controller('project-material-usages')
export class ProjectMaterialUsagesController {
  constructor(private readonly projectMaterialUsagesService: ProjectMaterialUsagesService) {}

  @Post() create(@Body() dto: CreateProjectMaterialUsageDto) { return this.projectMaterialUsagesService.create(dto); }
  @Get() findAll(@Query() query: ListProjectMaterialUsagesQueryDto) { return this.projectMaterialUsagesService.findAll(query); }
  @Get(':id') findOne(@Param('id') id: string) { return this.projectMaterialUsagesService.findOne(Number(id)); }
}
