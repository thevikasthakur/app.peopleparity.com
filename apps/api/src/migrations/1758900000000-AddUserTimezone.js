"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddUserTimezone1758900000000 = void 0;
class AddUserTimezone1758900000000 {
    constructor() {
        this.name = 'AddUserTimezone1758900000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD COLUMN IF NOT EXISTS "timezone" VARCHAR DEFAULT 'Asia/Kolkata'
        `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE "users"
            DROP COLUMN IF EXISTS "timezone"
        `);
    }
}
exports.AddUserTimezone1758900000000 = AddUserTimezone1758900000000;
//# sourceMappingURL=1758900000000-AddUserTimezone.js.map