import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  console.log('AppModule loaded successfully.');

  // Rich-text product/HACCP payloads can include images; raise default 100kb limit.
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ extended: true, limit: '25mb' }));

  // Required when the SPA runs on another origin (e.g. React :3000 → API :3006).
  // Without this, browsers send OPTIONS preflight and get 404 / blocked responses.
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
    ],
  });

  console.log('CORS enabled successfully.');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  console.log('Global validation pipe configured successfully.');
  const config = new DocumentBuilder()
    .setTitle('Food Safety Quality API')
    .setDescription('API for Food Safety Quality Management System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  console.log('Swagger configuration created successfully.');
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  console.log('Swagger module set up successfully.');
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`Backend running at http://localhost:${port}`);
  console.log(`Swagger available at http://localhost:${port}/api`);
}
void bootstrap();
