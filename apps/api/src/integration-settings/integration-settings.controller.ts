import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/current-user.decorator';
import { UpdateIntegrationSettingsDto } from './dto/update-integration-settings.dto';
import { IntegrationSettingsService } from './integration-settings.service';

@Controller('integration-settings')
export class IntegrationSettingsController {
  constructor(
    private readonly integrationSettingsService: IntegrationSettingsService,
  ) {}

  @Get()
  list() {
    return this.integrationSettingsService.listSettings();
  }

  @Put()
  update(
    @Body() dto: UpdateIntegrationSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.integrationSettingsService.updateSettings(dto, user.id);
  }
}
