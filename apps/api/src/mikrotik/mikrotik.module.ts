import { Module } from '@nestjs/common';
import { MikroTikClientFactory } from './clients/mikrotik-client.factory';
import { SecretCryptoService } from './crypto/secret-crypto.service';
import { MikrotikCommandLoggerService } from './mikrotik-command-logger.service';
import { MikrotikRouterAccessService } from './mikrotik-router-access.service';
import { MikrotikRoutersController } from './mikrotik-routers.controller';
import { MikrotikRoutersService } from './mikrotik-routers.service';
import { PppoeAccountsController } from './pppoe-accounts.controller';
import { PppoeAccountsService } from './pppoe-accounts.service';
import { PppoeSessionsController } from './pppoe-sessions.controller';
import { PppoeSessionsService } from './pppoe-sessions.service';
import { PppoeAccountActionLoggerService } from './pppoe-account-action-logger.service';

@Module({
  controllers: [
    MikrotikRoutersController,
    PppoeAccountsController,
    PppoeSessionsController,
  ],
  providers: [
    SecretCryptoService,
    MikroTikClientFactory,
    MikrotikCommandLoggerService,
    PppoeAccountActionLoggerService,
    MikrotikRouterAccessService,
    MikrotikRoutersService,
    PppoeAccountsService,
    PppoeSessionsService,
  ],
  exports: [PppoeAccountsService],
})
export class MikrotikModule {}
