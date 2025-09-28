"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// src/lambda.ts
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const platform_express_1 = require("@nestjs/platform-express");
const serverless_http_1 = __importDefault(require("serverless-http"));
const configure_app_1 = require("./configure-app");
let cachedHandler = null;
async function bootstrap() {
    // No direct "import express from 'express'"
    const adapter = new platform_express_1.ExpressAdapter();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, adapter, { logger: ['error', 'warn', 'log'] });
    await (0, configure_app_1.configureApp)(app); // CORS, pipes, prefix
    // Get the underlying Express instance from the adapter/Nest
    const expressApp = app.getHttpAdapter().getInstance();
    return (0, serverless_http_1.default)(expressApp, {
        requestId: 'x-request-id',
        provider: 'aws',
    });
}
const handler = async (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    if (!cachedHandler)
        cachedHandler = await bootstrap();
    return cachedHandler(event, context, callback);
};
exports.handler = handler;
//# sourceMappingURL=lambda.js.map