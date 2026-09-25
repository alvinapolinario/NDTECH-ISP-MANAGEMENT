import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/current-user.decorator';
import { RequireRoles, RolesGuard } from '../common/roles.guard';
import { STAFF_ROLES } from '../common/staff-role';
import { CreateCollectorRemittanceDto } from './dto/create-collector-remittance.dto';
import {
  ListCollectorRemittancesQueryDto,
  PreviewCollectorRemittanceQueryDto,
} from './dto/list-collector-remittances-query.dto';
import { CollectorRemittancesService } from './collector-remittances.service';

@Controller('collector-remittances')
@UseGuards(RolesGuard)
@RequireRoles(STAFF_ROLES.FINANCE)
export class CollectorRemittancesController {
  constructor(
    private readonly collectorRemittancesService: CollectorRemittancesService,
  ) {}

  @Get('preview')
  preview(
    @Query() query: PreviewCollectorRemittanceQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectorRemittancesService.preview(query, user);
  }

  @Get()
  findAll(
    @Query() query: ListCollectorRemittancesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectorRemittancesService.findAll(query, user);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectorRemittancesService.findOne(Number(id), user);
  }

  @Post()
  create(
    @Body() dto: CreateCollectorRemittanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectorRemittancesService.create(dto, user);
  }

  @Post(':id/void')
  void(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectorRemittancesService.void(Number(id), user);
  }
}
