import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityPeriod } from '../entities/activity-period.entity';
import { BotDetectionService } from '../modules/activity/bot-detection.service';

async function reprocessBotDetection() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const activityPeriodsRepo = app.get<Repository<ActivityPeriod>>(
    getRepositoryToken(ActivityPeriod),
  );
  const botDetectionService = app.get(BotDetectionService);

  console.log('🔍 Finding activity periods to reprocess...\n');

  // Get all activity periods for the test user from the last 24 hours
  const periods = await activityPeriodsRepo
    .createQueryBuilder('ap')
    .where('ap.userId = :userId', { userId: '9e8c1aba-0ed8-4d8a-a937-719f7e025543' })
    .andWhere('ap.createdAt > NOW() - INTERVAL \'24 hours\'')
    .andWhere('ap.metrics IS NOT NULL')
    .getMany();

  console.log(`Found ${periods.length} activity periods to reprocess\n`);

  let updatedCount = 0;
  let botDetectedCount = 0;

  for (const period of periods) {
    if (!period.metrics) continue;

    // Run bot detection
    const botDetectionResult = botDetectionService.detectBotActivity(period.metrics);

    // Update the metrics with new bot detection
    period.metrics.botDetection = {
      ...botDetectionResult,
      details: botDetectionResult.reasons, // Admin app expects 'details' field
    };

    // Save updated period
    await activityPeriodsRepo.save(period);
    updatedCount++;

    if (botDetectionResult.keyboardBotDetected || botDetectionResult.mouseBotDetected) {
      console.log(`🤖 BOT DETECTED in period ${period.id}`);
      console.log(`   Confidence: ${(botDetectionResult.confidence * 100).toFixed(0)}%`);
      console.log(`   Reasons:`, botDetectionResult.reasons);
      console.log('');
      botDetectedCount++;
    }
  }

  console.log('\n✅ Reprocessing Complete!');
  console.log(`   Total periods reprocessed: ${updatedCount}`);
  console.log(`   Periods with bot activity: ${botDetectedCount}`);
  console.log(`   Detection rate: ${((botDetectedCount / updatedCount) * 100).toFixed(1)}%`);

  await app.close();
}

reprocessBotDetection()
  .then(() => {
    console.log('\n✨ Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });