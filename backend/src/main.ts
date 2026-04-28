import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { validateStartupEnv } from './infrastructure/config/env.validation';
import { LoggingInterceptor } from './infrastructure/observability/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  validateStartupEnv(config);

  app.enableCors();
  app.useGlobalInterceptors(app.get(LoggingInterceptor));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  if (!isProduction) {
    const documentConfig = new DocumentBuilder()
      .setTitle('ANGREN TAXI API')
      .setDescription('Backend API for ANGREN TAXI MVP')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, documentConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
}

void bootstrap();
