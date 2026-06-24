import { Injectable } from '@nestjs/common';
import { SecretCryptoService } from '../crypto/secret-crypto.service';
import { MockMikroTikClient } from './mock-mikrotik.client';
import { RouterOsMikrotikClient } from './routeros-mikrotik.client';
import {
  MikroTikClient,
  MikroTikRouterConnection,
} from './mikrotik-client.interface';

type RouterRecord = {
  host: string;
  apiPort: number;
  username: string;
  passwordEncrypted: string;
};

@Injectable()
export class MikroTikClientFactory {
  constructor(private readonly secretCrypto: SecretCryptoService) {}

  create(router: RouterRecord): MikroTikClient {
    const connection: MikroTikRouterConnection = {
      host: router.host,
      apiPort: router.apiPort,
      username: router.username,
      password: this.secretCrypto.decrypt(router.passwordEncrypted),
    };

    const useMock = process.env.MIKROTIK_USE_MOCK !== 'false';
    if (useMock) {
      return new MockMikroTikClient(connection);
    }

    return new RouterOsMikrotikClient(connection);
  }
}
