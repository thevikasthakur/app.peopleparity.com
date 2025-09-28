"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MakeScreenshotIdNullable1757181501978 = void 0;
class MakeScreenshotIdNullable1757181501978 {
    constructor() {
        this.name = 'MakeScreenshotIdNullable1757181501978';
    }
    async up(queryRunner) {
        // Make screenshotId nullable in activity_periods table
        await queryRunner.query(`
            ALTER TABLE "activity_periods" 
            ALTER COLUMN "screenshotId" DROP NOT NULL
        `);
        console.log('✅ Made screenshotId column nullable in activity_periods table');
    }
    async down(queryRunner) {
        // Revert - make screenshotId NOT NULL again (but first remove any NULL values)
        await queryRunner.query(`
            DELETE FROM "activity_periods" 
            WHERE "screenshotId" IS NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "activity_periods" 
            ALTER COLUMN "screenshotId" SET NOT NULL
        `);
    }
}
exports.MakeScreenshotIdNullable1757181501978 = MakeScreenshotIdNullable1757181501978;
//# sourceMappingURL=1757181501978-MakeScreenshotIdNullable.js.map