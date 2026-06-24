import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/current-user.decorator';
import { ListSmsQueryDto } from './dto/list-sms-query.dto';
import { SendCustomerSmsDto } from './dto/send-customer-sms.dto';
import { SendSmsDto } from './dto/send-sms.dto';
import { SmsService } from './sms.service';

@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Get('account')
  getAccount() {
    return this.smsService.getAccount();
  }

  @Get('messages')
  findAll(@Query() query: ListSmsQueryDto) {
    return this.smsService.findAll(query);
  }

  @Get('messages/:id')
  findOne(@Param('id') id: string) {
    return this.smsService.findOne(Number(id));
  }

  @Post('send')
  send(@Body() dto: SendSmsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.smsService.send(dto, user.id);
  }

  @Post('send/customer/:customerId')
  sendToCustomer(
    @Param('customerId') customerId: string,
    @Body() dto: SendCustomerSmsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.smsService.sendToCustomer(Number(customerId), dto, user.id);
  }
}
