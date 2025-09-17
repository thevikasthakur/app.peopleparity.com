// Simple lambda handler that works better with serverless
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import serverlessExpress from '@codegenie/serverless-express';
import express from 'express';
import { configureApp } from './configure-app';

let cachedServer: any;

async function bootstrapServer() {
  if (!cachedServer) {
    const expressApp = express();
    const adapter = new ExpressAdapter(expressApp);
    
    const app = await NestFactory.create(AppModule, adapter, {
      logger: ['error', 'warn', 'log']
    });
    
    await configureApp(app);
    await app.init();
    
    cachedServer = serverlessExpress({ app: expressApp });
  }
  return cachedServer;
}

export const handler = async (event: any, context: any) => {
  // Don't wait for empty event loop
  context.callbackWaitsForEmptyEventLoop = false;
  
  const server = await bootstrapServer();
  return server(event, context);
};