import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { CreateInventoryCategoryDto } from './dto/create-inventory-category.dto';
import { UpdateInventoryCategoryDto } from './dto/update-inventory-category.dto';
import { InventoryCategoriesService } from './inventory-categories.service';

@Controller('inventory-categories')
export class InventoryCategoriesController {
  constructor(private readonly inventoryCategoriesService: InventoryCategoriesService) {}

  @Post()
  create(@Body() dto: CreateInventoryCategoryDto) {
    return this.inventoryCategoriesService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListQueryDto) {
    return this.inventoryCategoriesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventoryCategoriesService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInventoryCategoryDto) {
    return this.inventoryCategoriesService.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inventoryCategoriesService.remove(Number(id));
  }
}
