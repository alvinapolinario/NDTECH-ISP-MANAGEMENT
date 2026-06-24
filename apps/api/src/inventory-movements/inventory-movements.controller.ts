import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';
import { ListInventoryMovementsQueryDto } from './dto/list-inventory-movements-query.dto';
import { InventoryMovementsService } from './inventory-movements.service';

@Controller('inventory-movements')
export class InventoryMovementsController {
  constructor(private readonly inventoryMovementsService: InventoryMovementsService) {}

  @Post()
  create(@Body() dto: CreateInventoryMovementDto) {
    return this.inventoryMovementsService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListInventoryMovementsQueryDto) {
    return this.inventoryMovementsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventoryMovementsService.findOne(Number(id));
  }
}
