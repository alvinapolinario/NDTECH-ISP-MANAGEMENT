import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CreateCollectionCaseDto } from './dto/create-collection-case.dto';
import { ListCollectionCasesQueryDto } from './dto/list-collection-cases-query.dto';
import { UpdateCollectionCaseDto } from './dto/update-collection-case.dto';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post()
  create(@Body() dto: CreateCollectionCaseDto) {
    return this.collectionsService.create(dto);
  }

  @Post('import-overdue')
  importOverdue() {
    return this.collectionsService.importOverdue();
  }

  @Get()
  findAll(@Query() query: ListCollectionCasesQueryDto) {
    return this.collectionsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.collectionsService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCollectionCaseDto) {
    return this.collectionsService.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.collectionsService.remove(Number(id));
  }
}
