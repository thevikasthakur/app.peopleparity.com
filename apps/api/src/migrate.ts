import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';

async function runMigrations() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    // Get the TypeORM DataSource from the app
    const dataSource = app.get(DataSource);
    
    console.log('🚀 Running database migrations...');
    
    // Run pending migrations
    const migrations = await dataSource.runMigrations();
    
    if (migrations.length === 0) {
      console.log('✅ No new migrations to run');
    } else {
      console.log(`✅ Successfully ran ${migrations.length} migration(s):`);
      migrations.forEach(migration => {
        console.log(`   - ${migration.name}`);
      });
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runMigrations();