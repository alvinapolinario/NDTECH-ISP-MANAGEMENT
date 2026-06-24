import { config } from 'dotenv';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

const rootEnvFile =
  process.env.DOCKER_ENV === 'true' ? '.env.docker' : '.env';

config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '../../../', rootEnvFile), override: true });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
