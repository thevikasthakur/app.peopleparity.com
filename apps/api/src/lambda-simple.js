"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// Simple lambda handler that works better with serverless
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const platform_express_1 = require("@nestjs/platform-express");
const serverless_express_1 = __importDefault(require("@codegenie/serverless-express"));
const express_1 = __importDefault(require("express"));
const configure_app_1 = require("./configure-app");
let cachedServer;
async function bootstrapServer() {
    if (!cachedServer) {
        const expressApp = (0, express_1.default)();
        const adapter = new platform_express_1.ExpressAdapter(expressApp);
        const app = await core_1.NestFactory.create(app_module_1.AppModule, adapter, {
            logger: ['error', 'warn', 'log']
        });
        await (0, configure_app_1.configureApp)(app);
        await app.init();
        cachedServer = (0, serverless_express_1.default)({ app: expressApp });
    }
    return cachedServer;
}
const handler = async (event, context) => {
    // Don't wait for empty event loop
    context.callbackWaitsForEmptyEventLoop = false;
    const server = await bootstrapServer();
    return server(event, context);
};
exports.handler = handler;
//# sourceMappingURL=lambda-simple.js.map