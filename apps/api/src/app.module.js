"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
require("reflect-metadata");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const organizations_module_1 = require("./modules/organizations/organizations.module");
const projects_module_1 = require("./modules/projects/projects.module");
const sessions_module_1 = require("./modules/sessions/sessions.module");
const activity_module_1 = require("./modules/activity/activity.module");
const screenshots_module_1 = require("./modules/screenshots/screenshots.module");
const analytics_module_1 = require("./modules/analytics/analytics.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
// Import all entities explicitly for serverless
const user_entity_1 = require("./entities/user.entity");
const organization_entity_1 = require("./entities/organization.entity");
const project_entity_1 = require("./entities/project.entity");
const session_entity_1 = require("./entities/session.entity");
const activity_period_entity_1 = require("./entities/activity-period.entity");
const screenshot_entity_1 = require("./entities/screenshot.entity");
let AppModule = (() => {
    let _classDecorators = [(0, common_1.Module)({
            imports: [
                config_1.ConfigModule.forRoot({
                    isGlobal: true,
                }),
                typeorm_1.TypeOrmModule.forRootAsync({
                    imports: [config_1.ConfigModule],
                    useFactory: (configService) => ({
                        type: 'postgres',
                        host: configService.get('DATABASE_HOST'),
                        port: configService.get('DATABASE_PORT'),
                        username: configService.get('DATABASE_USER'),
                        password: configService.get('DATABASE_PASSWORD'),
                        database: configService.get('DATABASE_NAME'),
                        entities: [
                            user_entity_1.User,
                            organization_entity_1.Organization,
                            project_entity_1.Project,
                            session_entity_1.Session,
                            activity_period_entity_1.ActivityPeriod,
                            screenshot_entity_1.Screenshot
                        ],
                        migrations: [__dirname + '/migrations/*{.ts,.js}'],
                        synchronize: false, // Use migrations for schema management
                        migrationsRun: true, // Enable migrations to run automatically
                        logging: process.env.NODE_ENV === 'development',
                        ssl: configService.get('DATABASE_HOST')?.includes('supabase.com')
                            ? { rejectUnauthorized: false }
                            : false,
                        connectTimeoutMS: 30000,
                        extra: {
                            max: 10,
                            connectionTimeoutMillis: 30000,
                        },
                    }),
                    inject: [config_1.ConfigService],
                }),
                auth_module_1.AuthModule,
                users_module_1.UsersModule,
                organizations_module_1.OrganizationsModule,
                projects_module_1.ProjectsModule,
                sessions_module_1.SessionsModule,
                activity_module_1.ActivityModule,
                screenshots_module_1.ScreenshotsModule,
                analytics_module_1.AnalyticsModule,
                dashboard_module_1.DashboardModule,
            ],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AppModule = _classThis = class {
    };
    __setFunctionName(_classThis, "AppModule");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AppModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AppModule = _classThis;
})();
exports.AppModule = AppModule;
//# sourceMappingURL=app.module.js.map