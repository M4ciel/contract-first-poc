import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '#src/app.module.js';
import { loadConfig } from '#src/config/app-config.js';

const config = loadConfig(process.env);
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule.forRoot(config),
  new FastifyAdapter(),
);
app.enableShutdownHooks();
await app.listen({ port: config.port, host: config.host });
