import { Module } from '@nestjs/common';
import { ProjectBomsController } from './project-boms.controller';
import { ProjectBomsService } from './project-boms.service';

@Module({ controllers: [ProjectBomsController], providers: [ProjectBomsService] })
export class ProjectBomsModule {}
