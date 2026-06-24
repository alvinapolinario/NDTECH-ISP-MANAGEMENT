import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto';
import { ListInventoryAdjustmentsQueryDto } from './dto/list-inventory-adjustments-query.dto';
import { InventoryAdjustmentsService } from './inventory-adjustments.service';

@Controller('inventory-adjustments')
export class InventoryAdjustmentsController {
  constructor(private readonly inventoryAdjustmentsService: InventoryAdjustmentsService) {}

  @Post()
  create(@Body() dto: CreateInventoryAdjustmentDto) {
    return this.inventoryAdjustmentsService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListInventoryAdjustmentsQueryDto) {
    return this.inventoryAdjustmentsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventoryAdjustmentsService.findOne(Number(id));
  }
}
