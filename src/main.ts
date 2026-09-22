import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = [
    process.env.FRONTEND_URL ?? 'http://localhost:5173',
    process.env.BACKOFFICE_URL ?? 'http://localhost:5174',
  ];
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Target-Empresa-Id',
      'X-Empresa-Objetivo-Id',
    ],
    credentials: false,
  });

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SGCAET API')
    .setDescription(
      'API multi-tenant para activos, telecomunicaciones, solicitudes, auditorias y trazabilidad.',
    )
    .setVersion(process.env.APP_VERSION ?? '1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addServer(
      `http://localhost:${process.env.PORT ?? 4420}`,
      'Desarrollo local',
    )
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: { persistAuthorization: true },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
