import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateProjectCostingDto } from './dto/create-project-costing.dto';
import { ListProjectCostingsQueryDto } from './dto/list-project-costings-query.dto';
import { UpdateProjectCostingDto } from './dto/update-project-costing.dto';
import { ProjectCostingsService } from './project-costings.service';

@Controller('project-costings')
export class ProjectCostingsController {
  constructor(private readonly projectCostingsService: ProjectCostingsService) {}

  @Post() create(@Body() dto: CreateProjectCostingDto) { return this.projectCostingsService.create(dto); }
  @Get() findAll(@Query() query: ListProjectCostingsQueryDto) { return this.projectCostingsService.findAll(query); }
  @Get(':id') findOne(@Param('id') id: string) { return this.projectCostingsService.findOne(Number(id)); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateProjectCostingDto) { return this.projectCostingsService.update(Number(id), dto); }
  @Post(':id/finalize') finalize(@Param('id') id: string) { return this.projectCostingsService.setStatus(Number(id), 'final'); }
  @Delete(':id') remove(@Param('id') id: string) { return this.projectCostingsService.remove(Number(id)); }
}
