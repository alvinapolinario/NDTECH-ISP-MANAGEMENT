import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { CreateServicePlanDto } from './dto/create-service-plan.dto';
import { UpdateServicePlanDto } from './dto/update-service-plan.dto';
import { ServicePlansService } from './service-plans.service';

@Controller('service-plans')
export class ServicePlansController {
  constructor(private readonly servicePlansService: ServicePlansService) {}

  @Post()
  create(@Body() dto: CreateServicePlanDto) {
    return this.servicePlansService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListQueryDto) {
    return this.servicePlansService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.servicePlansService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateServicePlanDto) {
    return this.servicePlansService.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.servicePlansService.remove(Number(id));
  }
}
