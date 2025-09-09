import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

async function bootstrapLocal() {
  const app = await NestFactory.create(AppModule);

  await configureApp(app); // CORS, pipes, prefix

  const port = Number(process.env.PORT) || 3001;

  // Force IPv4 like before (desktop app compatibility)
  await app.listen(port, '127.0.0.1');

  console.log(`🚀 People Parity API running on http://127.0.0.1:${port}/api`);
}

/**
 * Only start an HTTP server when NOT running inside Lambda.
 * Lambda path uses src/lambda.ts, which imports AppModule separately.
 */
if (!process.env.LAMBDA_TASK_ROOT) {
  // serverless-offline sets IS_OFFLINE=true; that’s fine, it still won’t set LAMBDA_TASK_ROOT,
  // so this local server runs only when you use `npm run dev`.
  bootstrapLocal();
}
