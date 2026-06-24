import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { CustomerDocumentsService } from './customer-documents.service';
import { CreateCustomerDocumentDto } from './dto/create-customer-document.dto';

@Controller()
export class CustomerDocumentsController {
  constructor(private readonly customerDocumentsService: CustomerDocumentsService) {}

  @Get('customer-documents')
  findAll(@Query() query: ListQueryDto) {
    return this.customerDocumentsService.findAll(query);
  }

  @Post('customer-documents')
  createTopLevel(
    @Body('customerId') customerId: string,
    @Body() dto: CreateCustomerDocumentDto,
  ) {
    return this.customerDocumentsService.create(Number(customerId), dto);
  }

  @Get('customers/:customerId/documents')
  findByCustomer(@Param('customerId') customerId: string) {
    return this.customerDocumentsService.findByCustomer(Number(customerId));
  }

  @Post('customers/:customerId/documents')
  create(
    @Param('customerId') customerId: string,
    @Body() dto: CreateCustomerDocumentDto,
  ) {
    return this.customerDocumentsService.create(Number(customerId), dto);
  }

  @Delete('customer-documents/:id')
  remove(@Param('id') id: string) {
    return this.customerDocumentsService.remove(Number(id));
  }
}
