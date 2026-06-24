import { Module } from '@nestjs/common';
import { TechnicianAssignmentsController } from './technician-assignments.controller';
import { TechnicianAssignmentsService } from './technician-assignments.service';

@Module({
  controllers: [TechnicianAssignmentsController],
  providers: [TechnicianAssignmentsService],
})
export class TechnicianAssignmentsModule {}
