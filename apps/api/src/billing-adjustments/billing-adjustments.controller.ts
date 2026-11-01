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
import { BillingAdjustmentsService } from './billing-adjustments.service';
import { CreateBillingAdjustmentDto } from './dto/create-billing-adjustment.dto';
import { ListBillingAdjustmentsQueryDto } from './dto/list-billing-adjustments-query.dto';
import { UpdateBillingAdjustmentDto } from './dto/update-billing-adjustment.dto';

@Controller('billing-adjustments')
@UseGuards(RolesGuard)
export class BillingAdjustmentsController {
  constructor(private readonly adjustmentsService: BillingAdjustmentsService) {}

  @Post()
  @RequireRoles(STAFF_ROLES.FINANCE)
  create(@Body() dto: CreateBillingAdjustmentDto) {
    return this.adjustmentsService.create(dto);
  }

  @Get()
  @RequireRoles(STAFF_ROLES.FINANCE)
  findAll(@Query() query: ListBillingAdjustmentsQueryDto) {
    return this.adjustmentsService.findAll(query);
  }

  @Get(':id')
  @RequireRoles(STAFF_ROLES.FINANCE)
  findOne(@Param('id') id: string) {
    return this.adjustmentsService.findOne(Number(id));
  }

  @Patch(':id')
  @RequireRoles(STAFF_ROLES.FINANCE)
  update(@Param('id') id: string, @Body() dto: UpdateBillingAdjustmentDto) {
    return this.adjustmentsService.update(Number(id), dto);
  }

  @Post(':id/void')
  @RequireRoles(STAFF_ROLES.FINANCE)
  void(@Param('id') id: string) {
    return this.adjustmentsService.void(Number(id));
  }

  @Delete(':id')
  @RequireRoles(STAFF_ROLES.FINANCE)
  remove(@Param('id') id: string) {
    return this.adjustmentsService.remove(Number(id));
  }
}
