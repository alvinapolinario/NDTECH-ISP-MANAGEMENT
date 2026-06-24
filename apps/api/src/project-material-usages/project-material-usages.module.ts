import { Module } from '@nestjs/common';
import { ProjectMaterialUsagesController } from './project-material-usages.controller';
import { ProjectMaterialUsagesService } from './project-material-usages.service';

@Module({ controllers: [ProjectMaterialUsagesController], providers: [ProjectMaterialUsagesService] })
export class ProjectMaterialUsagesModule {}
