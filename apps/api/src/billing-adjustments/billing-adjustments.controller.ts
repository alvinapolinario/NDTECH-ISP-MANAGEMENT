import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { BillingAdjustmentsService } from './billing-adjustments.service';
import { CreateBillingAdjustmentDto } from './dto/create-billing-adjustment.dto';
import { ListBillingAdjustmentsQueryDto } from './dto/list-billing-adjustments-query.dto';
import { UpdateBillingAdjustmentDto } from './dto/update-billing-adjustment.dto';

@Controller('billing-adjustments')
export class BillingAdjustmentsController {
  constructor(private readonly adjustmentsService: BillingAdjustmentsService) {}

  @Post()
  create(@Body() dto: CreateBillingAdjustmentDto) {
    return this.adjustmentsService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListBillingAdjustmentsQueryDto) {
    return this.adjustmentsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adjustmentsService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBillingAdjustmentDto) {
    return this.adjustmentsService.update(Number(id), dto);
  }

  @Post(':id/void')
  void(@Param('id') id: string) {
    return this.adjustmentsService.void(Number(id));
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adjustmentsService.remove(Number(id));
  }
}
