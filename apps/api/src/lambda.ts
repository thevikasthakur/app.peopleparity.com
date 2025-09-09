// src/lambda.ts
import type { Handler, Context, Callback } from 'aws-lambda';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import serverless from 'serverless-http';
import { configureApp } from './configure-app';

let cachedHandler: Handler | null = null;

async function bootstrap(): Promise<Handler> {
  // No direct "import express from 'express'"
  const adapter = new ExpressAdapter();
  const app = await NestFactory.create(AppModule, adapter, { logger: ['error', 'warn', 'log'] });

  await configureApp(app); // CORS, pipes, prefix

  // Get the underlying Express instance from the adapter/Nest
  const expressApp = app.getHttpAdapter().getInstance();

  return serverless(expressApp, {
    requestId: 'x-request-id',
    provider: 'aws',
  }) as unknown as Handler;
}

export const handler: Handler = async (event, context: Context, callback: Callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  if (!cachedHandler) cachedHandler = await bootstrap();
  return cachedHandler(event, context, callback);
};
