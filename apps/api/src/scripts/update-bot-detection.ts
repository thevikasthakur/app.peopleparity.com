import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { BotDetectionService } from '../modules/activity/bot-detection.service';

async function updateExistingActivityPeriods() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const botDetectionService = app.get(BotDetectionService);

  console.log('\n🔍 Updating existing activity periods with bot detection data...\n');

  try {
    // Get all activity periods with metrics
    const activityPeriods = await dataSource.query(`
      SELECT id, metrics
      FROM activity_periods
      WHERE metrics IS NOT NULL
      ORDER BY "createdAt" DESC
      LIMIT 1000
    `);

    console.log(`Found ${activityPeriods.length} activity periods with metrics\n`);

    let updatedCount = 0;
    let botDetectedCount = 0;

    for (const period of activityPeriods) {
      if (period.metrics) {
        // Run bot detection analysis
        const botDetectionResult = botDetectionService.detectBotActivity(period.metrics);

        // Only update if bot activity was detected
        if (botDetectionResult.keyboardBotDetected || botDetectionResult.mouseBotDetected) {
          // Add bot detection to metrics
          const updatedMetrics = {
            ...period.metrics,
            botDetection: botDetectionResult
          };

          // Update the database
          await dataSource.query(`
            UPDATE activity_periods
            SET metrics = $1
            WHERE id = $2
          `, [updatedMetrics, period.id]);

          updatedCount++;
          botDetectedCount++;

          console.log(`✅ Updated period ${period.id} - Bot detected!`);
          console.log(`   Keyboard Bot: ${botDetectionResult.keyboardBotDetected}`);
          console.log(`   Mouse Bot: ${botDetectionResult.mouseBotDetected}`);
          console.log(`   Confidence: ${(botDetectionResult.confidence * 100).toFixed(0)}%`);

          if (botDetectionResult.reasons.length > 0) {
            console.log(`   Reasons:`);
            botDetectionResult.reasons.forEach(reason => {
              console.log(`     - ${reason}`);
            });
          }
          console.log('');
        }
      }
    }

    console.log('\n\n===== UPDATE COMPLETE =====');
    console.log(`Total periods processed: ${activityPeriods.length}`);
    console.log(`Periods updated with bot detection: ${updatedCount}`);
    console.log(`Bot activity detected in: ${botDetectedCount} periods`);

    // Now let's specifically check the screenshot we're interested in
    const targetScreenshotId = 'e452b280-fdc6-44b9-8262-43e92e88774c';
    console.log(`\n\n🎯 Checking target screenshot: ${targetScreenshotId}`);

    const targetPeriods = await dataSource.query(`
      SELECT id, metrics, "activityScore"
      FROM activity_periods
      WHERE "screenshotId" = $1
      ORDER BY "periodEnd"
    `, [targetScreenshotId]);

    console.log(`Found ${targetPeriods.length} activity periods for target screenshot`);

    let targetBotCount = 0;
    targetPeriods.forEach((period, idx) => {
      if (period.metrics?.botDetection) {
        const bd = period.metrics.botDetection;
        if (bd.keyboardBotDetected || bd.mouseBotDetected) {
          targetBotCount++;
          console.log(`Period ${idx + 1}: Bot detected (Confidence: ${(bd.confidence * 100).toFixed(0)}%)`);
        }
      }
    });

    console.log(`\nBot detection in target screenshot: ${targetBotCount}/${targetPeriods.length} periods flagged`);

  } catch (error) {
    console.error('Error updating activity periods:', error);
  } finally {
    await app.close();
  }
}

updateExistingActivityPeriods().catch(console.error);