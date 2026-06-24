import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CompleteTechnicianAssignmentDto } from './dto/complete-technician-assignment.dto';
import { CreateTechnicianAssignmentDto } from './dto/create-technician-assignment.dto';
import { ListTechnicianAssignmentsQueryDto } from './dto/list-technician-assignments-query.dto';
import { UpdateTechnicianAssignmentDto } from './dto/update-technician-assignment.dto';
import { TechnicianAssignmentsService } from './technician-assignments.service';

@Controller('technician-assignments')
export class TechnicianAssignmentsController {
  constructor(private readonly technicianAssignmentsService: TechnicianAssignmentsService) {}

  @Post()
  create(@Body() dto: CreateTechnicianAssignmentDto) {
    return this.technicianAssignmentsService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListTechnicianAssignmentsQueryDto) {
    return this.technicianAssignmentsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.technicianAssignmentsService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTechnicianAssignmentDto) {
    return this.technicianAssignmentsService.update(Number(id), dto);
  }

  @Post(':id/accept')
  accept(@Param('id') id: string) {
    return this.technicianAssignmentsService.setStatus(Number(id), 'accepted');
  }

  @Post(':id/start')
  start(@Param('id') id: string) {
    return this.technicianAssignmentsService.setStatus(Number(id), 'in_progress');
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @Body() dto: CompleteTechnicianAssignmentDto) {
    return this.technicianAssignmentsService.complete(Number(id), dto.completionNotes);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.technicianAssignmentsService.setStatus(Number(id), 'cancelled');
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.technicianAssignmentsService.remove(Number(id));
  }
}
