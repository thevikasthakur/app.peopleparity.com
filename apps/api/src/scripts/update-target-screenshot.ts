import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { BotDetectionService } from '../modules/activity/bot-detection.service';

async function updateTargetScreenshot() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const botDetectionService = app.get(BotDetectionService);

  const targetScreenshotId = 'e452b280-fdc6-44b9-8262-43e92e88774c';
  console.log(`\n🎯 Updating activity periods for screenshot: ${targetScreenshotId}\n`);

  try {
    // Get activity periods for the specific screenshot
    const activityPeriods = await dataSource.query(`
      SELECT id, metrics, "activityScore"
      FROM activity_periods
      WHERE "screenshotId" = $1
      ORDER BY "periodEnd"
    `, [targetScreenshotId]);

    console.log(`Found ${activityPeriods.length} activity periods\n`);

    let updatedCount = 0;
    let botDetectedCount = 0;

    for (let i = 0; i < activityPeriods.length; i++) {
      const period = activityPeriods[i];
      console.log(`\n===== Period ${i + 1} =====`);
      console.log(`ID: ${period.id}`);
      console.log(`Activity Score: ${period.activityScore}`);

      if (period.metrics) {
        // Log current metrics
        if (period.metrics.keyboard) {
          console.log('Keyboard metrics:');
          console.log(`  Total keystrokes: ${period.metrics.keyboard.totalKeystrokes}`);
          console.log(`  Unique keys: ${period.metrics.keyboard.uniqueKeys}`);
        }

        // Run bot detection analysis
        const botDetectionResult = botDetectionService.detectBotActivity(period.metrics);

        // Update metrics with bot detection
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

        if (botDetectionResult.keyboardBotDetected || botDetectionResult.mouseBotDetected) {
          botDetectedCount++;
          console.log(`\n🤖 Bot detected!`);
          console.log(`   Keyboard Bot: ${botDetectionResult.keyboardBotDetected}`);
          console.log(`   Mouse Bot: ${botDetectionResult.mouseBotDetected}`);
          console.log(`   Confidence: ${(botDetectionResult.confidence * 100).toFixed(0)}%`);
          console.log(`   Reasons:`);
          botDetectionResult.reasons.forEach(reason => {
            console.log(`     - ${reason}`);
          });
        } else {
          console.log('\n✅ No bot activity detected');
        }
      } else {
        console.log('\n❌ No metrics data available');
      }
    }

    console.log('\n\n===== UPDATE COMPLETE =====');
    console.log(`Total periods processed: ${activityPeriods.length}`);
    console.log(`Periods updated: ${updatedCount}`);
    console.log(`Bot activity detected in: ${botDetectedCount} periods`);

    // Run cross-period analysis
    console.log('\n\n===== Cross-Period Analysis =====');
    const consistencyResult = botDetectionService.analyzePeriodConsistency(activityPeriods);
    console.log(`Suspicious Pattern Detected: ${consistencyResult.isSuspicious}`);
    console.log(`Confidence: ${(consistencyResult.confidence * 100).toFixed(0)}%`);
    if (consistencyResult.reasons.length > 0) {
      console.log('Reasons:');
      consistencyResult.reasons.forEach(reason => {
        console.log(`  - ${reason}`);
      });
    }

  } catch (error) {
    console.error('Error updating activity periods:', error);
  } finally {
    await app.close();
  }
}

updateTargetScreenshot().catch(console.error);