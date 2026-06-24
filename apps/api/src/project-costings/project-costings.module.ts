import { Module } from '@nestjs/common';
import { ProjectCostingsController } from './project-costings.controller';
import { ProjectCostingsService } from './project-costings.service';

@Module({ controllers: [ProjectCostingsController], providers: [ProjectCostingsService] })
export class ProjectCostingsModule {}
