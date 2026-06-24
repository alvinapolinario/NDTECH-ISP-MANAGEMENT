import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SecretCryptoService } from './crypto/secret-crypto.service';

@Injectable()
export class MikrotikRouterAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly secretCrypto: SecretCryptoService,
  ) {}

  async getRouterWithSecret(id: number) {
    const router = await this.prisma.mikrotikRouter.findUnique({
      where: { id },
    });

    if (!router) {
      throw new NotFoundException('MikroTik router not found');
    }

    const { reencrypted } = this.secretCrypto.decryptWithMigration(
      router.passwordEncrypted,
    );

    if (reencrypted) {
      return this.prisma.mikrotikRouter.update({
        where: { id },
        data: { passwordEncrypted: reencrypted },
      });
    }

    return router;
  }
}
