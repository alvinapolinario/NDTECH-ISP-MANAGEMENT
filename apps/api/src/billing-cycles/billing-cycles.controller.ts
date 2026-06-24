import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { BillingCyclesService } from './billing-cycles.service';
import { CreateBillingCycleDto } from './dto/create-billing-cycle.dto';
import { ListBillingCyclesQueryDto } from './dto/list-billing-cycles-query.dto';
import { UpdateBillingCycleDto } from './dto/update-billing-cycle.dto';

@Controller('billing-cycles')
export class BillingCyclesController {
  constructor(private readonly billingCyclesService: BillingCyclesService) {}

  @Post()
  create(@Body() dto: CreateBillingCycleDto) {
    return this.billingCyclesService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListBillingCyclesQueryDto) {
    return this.billingCyclesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.billingCyclesService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBillingCycleDto) {
    return this.billingCyclesService.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.billingCyclesService.remove(Number(id));
  }
}
