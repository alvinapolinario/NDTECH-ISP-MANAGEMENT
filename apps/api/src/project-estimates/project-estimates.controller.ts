import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateProjectEstimateDto } from './dto/create-project-estimate.dto';
import { ListProjectEstimatesQueryDto } from './dto/list-project-estimates-query.dto';
import { UpdateProjectEstimateDto } from './dto/update-project-estimate.dto';
import { ProjectEstimatesService } from './project-estimates.service';

@Controller('project-estimates')
export class ProjectEstimatesController {
  constructor(private readonly projectEstimatesService: ProjectEstimatesService) {}

  @Post()
  create(@Body() dto: CreateProjectEstimateDto) { return this.projectEstimatesService.create(dto); }
  @Get()
  findAll(@Query() query: ListProjectEstimatesQueryDto) { return this.projectEstimatesService.findAll(query); }
  @Get(':id')
  findOne(@Param('id') id: string) { return this.projectEstimatesService.findOne(Number(id)); }
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectEstimateDto) { return this.projectEstimatesService.update(Number(id), dto); }
  @Post(':id/approve')
  approve(@Param('id') id: string) { return this.projectEstimatesService.setStatus(Number(id), 'approved'); }
  @Post(':id/reject')
  reject(@Param('id') id: string) { return this.projectEstimatesService.setStatus(Number(id), 'rejected'); }
  @Delete(':id')
  remove(@Param('id') id: string) { return this.projectEstimatesService.remove(Number(id)); }
}
