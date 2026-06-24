import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { ListGoodsReceiptsQueryDto } from './dto/list-goods-receipts-query.dto';
import { GoodsReceiptsService } from './goods-receipts.service';

@Controller('goods-receipts')
export class GoodsReceiptsController {
  constructor(private readonly goodsReceiptsService: GoodsReceiptsService) {}

  @Post()
  create(@Body() dto: CreateGoodsReceiptDto) {
    return this.goodsReceiptsService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListGoodsReceiptsQueryDto) {
    return this.goodsReceiptsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.goodsReceiptsService.findOne(Number(id));
  }
}
