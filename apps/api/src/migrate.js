"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const typeorm_1 = require("typeorm");
async function runMigrations() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    try {
        // Get the TypeORM DataSource from the app
        const dataSource = app.get(typeorm_1.DataSource);
        console.log('🚀 Running database migrations...');
        // Run pending migrations
        const migrations = await dataSource.runMigrations();
        if (migrations.length === 0) {
            console.log('✅ No new migrations to run');
        }
        else {
            console.log(`✅ Successfully ran ${migrations.length} migration(s):`);
            migrations.forEach(migration => {
                console.log(`   - ${migration.name}`);
            });
        }
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
    finally {
        await app.close();
    }
}
runMigrations();
//# sourceMappingURL=migrate.js.map