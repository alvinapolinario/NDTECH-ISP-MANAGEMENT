import { Module } from '@nestjs/common';
import { SecretCryptoService } from '../mikrotik/crypto/secret-crypto.service';
import { IntegrationSettingsController } from './integration-settings.controller';
import { IntegrationSettingsService } from './integration-settings.service';

@Module({
  controllers: [IntegrationSettingsController],
  providers: [IntegrationSettingsService, SecretCryptoService],
  exports: [IntegrationSettingsService],
})
export class IntegrationSettingsModule {}
