import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { Env } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.enableShutdownHooks();
  app.use(cookieParser());
  app.enableCors({
    origin: [config.get('CLIENT_URL', { infer: true })],
    credentials: true,
  });

  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
