import { Module } from '@nestjs/common';
import { ProjectEstimatesController } from './project-estimates.controller';
import { ProjectEstimatesService } from './project-estimates.service';

@Module({ controllers: [ProjectEstimatesController], providers: [ProjectEstimatesService] })
export class ProjectEstimatesModule {}
