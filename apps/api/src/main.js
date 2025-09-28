"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const configure_app_1 = require("./configure-app");
async function bootstrapLocal() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    await (0, configure_app_1.configureApp)(app); // CORS, pipes, prefix
    const port = Number(process.env.PORT) || 3001;
    // Listen on all interfaces to avoid IPv4/IPv6 issues
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 People Parity API running on http://localhost:${port}/api`);
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
//# sourceMappingURL=main.js.map