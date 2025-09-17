import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

async function resetPassword() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const dataSource = app.get(DataSource);
    
    const email = 'vikas@inzint.com';
    const newPassword = 'Expresstrack1!';
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the user's password
    const result = await dataSource.query(
      `UPDATE users SET password = $1 WHERE email = $2`,
      [hashedPassword, email]
    );
    
    if (result[1] > 0) {
      console.log(`✅ Password reset successfully for ${email}`);
    } else {
      console.log(`❌ User with email ${email} not found`);
      
      // Create the user if it doesn't exist
      console.log('Creating user...');
      await dataSource.query(
        `INSERT INTO users (id, email, name, password, role, "isActive", "createdAt", "updatedAt") 
         VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())`,
        [email, 'Vikas', hashedPassword, 'developer']
      );
      console.log(`✅ User created with email ${email}`);
    }
    
  } catch (error) {
    console.error('❌ Error resetting password:', error);
  } finally {
    await app.close();
  }
}

resetPassword();