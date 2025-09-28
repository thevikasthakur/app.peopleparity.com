"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureApp = configureApp;
const common_1 = require("@nestjs/common");
function corsOriginFromEnv() {
    const raw = process.env.CORS_ORIGINS?.trim();
    // Defaults for local dev
    if (!raw || raw.length === 0) {
        return ["http://localhost:5173", "http://localhost:3000"];
    }
    // Allow-all flags
    if (raw === "*" || raw.toLowerCase() === "true" || raw === "1") {
        return true;
    }
    // Comma-separated list
    return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}
async function configureApp(app) {
    const origin = corsOriginFromEnv(); // boolean | string[]
    app.enableCors({ origin, credentials: true });
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix("api");
    await app.init();
    return app;
}
//# sourceMappingURL=configure-app.js.map