"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../app.module");
const bcrypt = __importStar(require("bcrypt"));
const typeorm_1 = require("typeorm");
async function resetPassword() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    try {
        const dataSource = app.get(typeorm_1.DataSource);
        const email = 'vikas@inzint.com';
        const newPassword = 'Expresstrack1!';
        // Hash the password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        // Update the user's password
        const result = await dataSource.query(`UPDATE users SET password = $1 WHERE email = $2`, [hashedPassword, email]);
        if (result[1] > 0) {
            console.log(`✅ Password reset successfully for ${email}`);
        }
        else {
            console.log(`❌ User with email ${email} not found`);
            // Create the user if it doesn't exist
            console.log('Creating user...');
            await dataSource.query(`INSERT INTO users (id, email, name, password, role, "isActive", "createdAt", "updatedAt") 
         VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())`, [email, 'Vikas', hashedPassword, 'developer']);
            console.log(`✅ User created with email ${email}`);
        }
    }
    catch (error) {
        console.error('❌ Error resetting password:', error);
    }
    finally {
        await app.close();
    }
}
resetPassword();
//# sourceMappingURL=reset-password.js.map