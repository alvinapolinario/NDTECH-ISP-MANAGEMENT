import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CustomerAddressesService } from './customer-addresses.service';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-customer-address.dto';

@Controller()
export class CustomerAddressesController {
  constructor(private readonly customerAddressesService: CustomerAddressesService) {}

  @Get('customers/:customerId/addresses')
  findByCustomer(@Param('customerId') customerId: string) {
    return this.customerAddressesService.findByCustomer(Number(customerId));
  }

  @Post('customers/:customerId/addresses')
  create(
    @Param('customerId') customerId: string,
    @Body() dto: CreateCustomerAddressDto,
  ) {
    return this.customerAddressesService.create(Number(customerId), dto);
  }

  @Patch('customer-addresses/:id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerAddressDto) {
    return this.customerAddressesService.update(Number(id), dto);
  }

  @Delete('customer-addresses/:id')
  remove(@Param('id') id: string) {
    return this.customerAddressesService.remove(Number(id));
  }
}
