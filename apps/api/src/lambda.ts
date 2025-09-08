// src/lambda.ts
import type { Handler, Context, Callback } from 'aws-lambda';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import serverless from 'serverless-http';
import express from 'express';

let cachedHandler: Handler | null = null;

async function bootstrap(): Promise<Handler> {
  const expressApp = express();

  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    logger: ['error', 'warn', 'log'],
  });

  app.enableCors({ origin: true, credentials: true });
  await app.init();

  // NOTE: removed callbackWaitsForEmptyEventLoop here (not a valid option)
  return serverless(expressApp, {
    requestId: 'x-request-id',
    provider: 'aws',
  })
}

export const handler: Handler = async (event, context: Context, callback: Callback) => {
  // Correct place to set this flag
  context.callbackWaitsForEmptyEventLoop = false;

  if (!cachedHandler) {
    cachedHandler = await bootstrap();
  }
  return cachedHandler(event, context, callback);
};
