import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RequireRoles, RolesGuard } from '../common/roles.guard';
import { STAFF_ROLES } from '../common/staff-role';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @RequireRoles(STAFF_ROLES.FINANCE, STAFF_ROLES.COLLECTOR)
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Get()
  @RequireRoles(STAFF_ROLES.FINANCE, STAFF_ROLES.COLLECTOR)
  findAll(@Query() query: ListPaymentsQueryDto) {
    return this.paymentsService.findAll(query);
  }

  @Get(':id')
  @RequireRoles(STAFF_ROLES.FINANCE, STAFF_ROLES.COLLECTOR)
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(Number(id));
  }

  @Patch(':id')
  @RequireRoles(STAFF_ROLES.FINANCE)
  update(@Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.paymentsService.update(Number(id), dto);
  }

  @Post(':id/void')
  @RequireRoles(STAFF_ROLES.FINANCE)
  void(@Param('id') id: string) {
    return this.paymentsService.void(Number(id));
  }

  @Delete(':id')
  @RequireRoles(STAFF_ROLES.FINANCE)
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(Number(id));
  }
}
