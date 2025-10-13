const { Client } = require('pg');

// Database connection
const client = new Client({
  host: 'aws-1-ap-south-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.wbqjfspfleboymnvkkte',
  password: 'FIr5FKZ3YqwRuxxv',
  database: 'postgres'
});

async function verifyBotDetection() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get the most recent screenshot for the test user
    const query = `
      SELECT
        s.id,
        s."capturedAt",
        s.notes,
        COUNT(ap.id) as activity_period_count,
        COUNT(CASE WHEN
          (ap.metrics->'botDetection'->>'keyboardBotDetected')::boolean = true OR
          (ap.metrics->'botDetection'->>'mouseBotDetected')::boolean = true
        THEN 1 END) as bot_detected_count
      FROM screenshots s
      LEFT JOIN activity_periods ap ON ap."screenshotId" = s.id
      WHERE s."userId" = '9e8c1aba-0ed8-4d8a-a937-719f7e025543'
      GROUP BY s.id, s."capturedAt", s.notes
      ORDER BY s."capturedAt" DESC
      LIMIT 5
    `;

    const result = await client.query(query);

    console.log('📊 Recent Screenshots Bot Detection Status:\n');
    console.log('=' .repeat(80));

    if (result.rows.length === 0) {
      console.log('No screenshots found for this user');
      return;
    }

    for (const row of result.rows) {
      const capturedAt = new Date(row.capturedAt);
      const hasBotActivity = row.bot_detected_count > 0;

      console.log(`\nScreenshot ID: ${row.id}`);
      console.log(`Captured At: ${capturedAt.toLocaleString()}`);
      console.log(`Notes: ${row.notes || 'N/A'}`);
      console.log(`Activity Periods: ${row.activity_period_count}`);
      console.log(`Bot Detected Periods: ${row.bot_detected_count}`);

      if (hasBotActivity) {
        console.log(`🚨 Status: BOT ACTIVITY DETECTED! 🚨`);
      } else {
        console.log(`✅ Status: No bot activity detected`);
      }
      console.log('-'.repeat(80));
    }

    // Get detailed bot detection info for the most recent screenshot
    console.log('\n\n📝 Detailed Bot Detection Analysis (Most Recent Screenshot):\n');
    console.log('='.repeat(80));

    const detailQuery = `
      SELECT
        ap.id,
        ap."periodStart",
        ap."periodEnd",
        ap."activityScore",
        ap.metrics->'botDetection'->>'keyboardBotDetected' as keyboard_bot,
        ap.metrics->'botDetection'->>'mouseBotDetected' as mouse_bot,
        ap.metrics->'botDetection'->>'confidence' as confidence,
        ap.metrics->'botDetection'->'details' as details,
        ap.metrics->'keyboard'->>'totalKeystrokes' as keystrokes,
        jsonb_array_length(COALESCE(ap.metrics->'keyboard'->'keystrokeCodes', '[]'::jsonb)) as keystroke_codes_count
      FROM activity_periods ap
      WHERE ap."screenshotId" = $1
      ORDER BY ap."periodStart"
    `;

    const mostRecentId = result.rows[0].id;
    const detailResult = await client.query(detailQuery, [mostRecentId]);

    for (const period of detailResult.rows) {
      const start = new Date(period.periodStart);
      const end = new Date(period.periodEnd);
      const keyboardBot = period.keyboard_bot === 'true';
      const mouseBot = period.mouse_bot === 'true';
      const confidence = parseFloat(period.confidence || 0);

      console.log(`\n⏱️  Period: ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`);
      console.log(`   Activity Score: ${period.activityScore}`);
      console.log(`   Keystrokes: ${period.keystrokes || 0} (Raw codes: ${period.keystroke_codes_count})`);
      console.log(`   Keyboard Bot: ${keyboardBot ? '🚨 DETECTED' : '✅ Not detected'}`);
      console.log(`   Mouse Bot: ${mouseBot ? '🚨 DETECTED' : '✅ Not detected'}`);
      console.log(`   Confidence: ${(confidence * 100).toFixed(0)}%`);

      if (period.details && Array.isArray(period.details) && period.details.length > 0) {
        console.log(`   🔍 Detection Reasons:`);
        period.details.forEach((reason, idx) => {
          console.log(`      ${idx + 1}. ${reason}`);
        });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✨ Verification Complete!\n');

    // Summary
    const totalScreenshots = result.rows.length;
    const screenshotsWithBots = result.rows.filter(r => r.bot_detected_count > 0).length;

    console.log('📈 Summary:');
    console.log(`   Total Recent Screenshots: ${totalScreenshots}`);
    console.log(`   Screenshots with Bot Activity: ${screenshotsWithBots}`);
    console.log(`   Detection Rate: ${((screenshotsWithBots / totalScreenshots) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
    console.log('\n🔌 Disconnected from database');
  }
}

verifyBotDetection();