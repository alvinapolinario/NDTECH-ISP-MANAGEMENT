import { config } from 'dotenv';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import { AppModule } from './app.module';

const rootEnvFile =
  process.env.DOCKER_ENV === 'true' ? '.env.docker' : '.env';

config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '../../../', rootEnvFile), override: true });

function registerMikrotikCrashGuard() {
  const isRosEmptyReply = (error: unknown) => {
    const errno = (error as { errno?: string })?.errno;
    const message =
      error instanceof Error ? error.message : String(error ?? '');
    return (
      (errno === 'UNKNOWNREPLY' && message.includes('!empty')) ||
      errno === 'UNREGISTEREDTAG'
    );
  };

  process.on('uncaughtException', (error: Error) => {
    if (isRosEmptyReply(error)) {
      console.error(
        '[MikroTik] Ignored uncaught RouterOS !empty reply (API kept running)',
      );
      return;
    }

    console.error('Uncaught exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    if (isRosEmptyReply(reason)) {
      console.error(
        '[MikroTik] Ignored unhandled RouterOS !empty reply (API kept running)',
      );
      return;
    }

    console.error('Unhandled rejection:', reason);
  });
}

registerMikrotikCrashGuard();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(
    json({
      verify: (request, _response, buffer) => {
        if (request.url?.includes('/payment-gateways/webhooks/')) {
          (request as { rawBody?: Buffer }).rawBody = buffer;
        }
      },
    }),
  );
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
