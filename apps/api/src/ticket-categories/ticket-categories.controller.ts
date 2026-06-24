import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { CreateTicketCategoryDto } from './dto/create-ticket-category.dto';
import { UpdateTicketCategoryDto } from './dto/update-ticket-category.dto';
import { TicketCategoriesService } from './ticket-categories.service';

@Controller('ticket-categories')
export class TicketCategoriesController {
  constructor(private readonly ticketCategoriesService: TicketCategoriesService) {}

  @Post()
  create(@Body() dto: CreateTicketCategoryDto) {
    return this.ticketCategoriesService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListQueryDto) {
    return this.ticketCategoriesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketCategoriesService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTicketCategoryDto) {
    return this.ticketCategoriesService.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ticketCategoriesService.remove(Number(id));
  }
}
