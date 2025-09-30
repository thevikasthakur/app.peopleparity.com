import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { BotDetectionService } from '../modules/activity/bot-detection.service';

async function analyzeActivityPeriods() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const botDetectionService = app.get(BotDetectionService);

  const screenshotId = 'e452b280-fdc6-44b9-8262-43e92e88774c';

  console.log(`\n🔍 Analyzing activity periods for screenshot: ${screenshotId}\n`);

  // Get activity periods for the screenshot
  const activityPeriods = await dataSource.query(`
    SELECT
      id,
      "screenshotId",
      "activityScore",
      "isValid",
      metrics,
      "periodStart",
      "periodEnd"
    FROM activity_periods
    WHERE "screenshotId" = $1
    ORDER BY "periodEnd"
  `, [screenshotId]);

  console.log(`Found ${activityPeriods.length} activity periods\n`);

  let botDetectedCount = 0;
  const allScores: number[] = [];

  activityPeriods.forEach((period: any, index: number) => {
    console.log(`\n===== Activity Period ${index + 1} =====`);
    console.log(`ID: ${period.id}`);
    console.log(`Activity Score: ${period.activityScore}`);
    console.log(`Is Valid: ${period.isValid}`);

    allScores.push(period.activityScore || 0);

    if (period.metrics) {
      // Run bot detection
      const botDetectionResult = botDetectionService.detectBotActivity(period.metrics);

      console.log('\n📊 Metrics Analysis:');

      // Keyboard metrics
      if (period.metrics.keyboard) {
        const kb = period.metrics.keyboard;
        console.log('  Keyboard:');
        console.log(`    Total keystrokes: ${kb.totalKeystrokes}`);
        console.log(`    Unique keys: ${kb.uniqueKeys}`);
        console.log(`    Productive keystrokes: ${kb.productiveKeystrokes}`);

        if (kb.typingRhythm) {
          console.log(`    Typing rhythm std dev: ${kb.typingRhythm.stdDeviationMs}ms`);
        }
      }

      // Mouse metrics
      if (period.metrics.mouse) {
        const mouse = period.metrics.mouse;
        console.log('  Mouse:');
        console.log(`    Total clicks: ${mouse.totalClicks}`);
        console.log(`    Total scrolls: ${mouse.totalScrolls}`);
        console.log(`    Distance: ${mouse.distancePixels}px`);
      }

      // Bot detection results
      console.log('\n🤖 Bot Detection Results:');
      console.log(`  Keyboard Bot Detected: ${botDetectionResult.keyboardBotDetected}`);
      console.log(`  Mouse Bot Detected: ${botDetectionResult.mouseBotDetected}`);
      console.log(`  Confidence: ${(botDetectionResult.confidence * 100).toFixed(0)}%`);

      if (botDetectionResult.reasons.length > 0) {
        console.log('  Reasons:');
        botDetectionResult.reasons.forEach(reason => {
          console.log(`    ⚠️ ${reason}`);
        });
      }

      if (botDetectionResult.keyboardBotDetected || botDetectionResult.mouseBotDetected) {
        botDetectedCount++;
      }
    } else {
      console.log('\n❌ No metrics data available');
    }
  });

  // Check for cross-period consistency patterns
  console.log('\n\n===== Cross-Period Analysis =====');
  const consistencyResult = botDetectionService.analyzePeriodConsistency(activityPeriods);

  console.log(`Suspicious Pattern Detected: ${consistencyResult.isSuspicious}`);
  console.log(`Confidence: ${(consistencyResult.confidence * 100).toFixed(0)}%`);

  if (consistencyResult.reasons.length > 0) {
    console.log('Reasons:');
    consistencyResult.reasons.forEach(reason => {
      console.log(`  ⚠️ ${reason}`);
    });
  }

  // Overall statistics
  const avgScore = allScores.length > 0
    ? allScores.reduce((a, b) => a + b, 0) / allScores.length
    : 0;

  console.log('\n\n===== Overall Statistics =====');
  console.log(`Total activity periods: ${activityPeriods.length}`);
  console.log(`Bot activity detected in: ${botDetectedCount} periods`);
  console.log(`Average activity score: ${avgScore.toFixed(2)}`);
  console.log(`All scores: ${allScores.join(', ')}`);

  // Final verdict
  console.log('\n\n===== FINAL VERDICT =====');
  if (botDetectedCount > 0 || consistencyResult.isSuspicious) {
    console.log('🚨 SUSPICIOUS ACTIVITY DETECTED!');
    console.log(`   - ${botDetectedCount}/${activityPeriods.length} periods show bot-like behavior`);
    if (consistencyResult.isSuspicious) {
      console.log(`   - Cross-period analysis shows suspicious patterns`);
    }
  } else {
    console.log('✅ No suspicious activity detected');
  }

  await app.close();
}

analyzeActivityPeriods().catch(console.error);