import { processKeyCodesInReasons } from './keyCodeMapper';

interface BotDetectionInstance {
  screenshotId: string;
  capturedAt: string;
  periodStart: string;
  periodEnd: string;
  botDetection: {
    keyboardBotDetected: boolean;
    mouseBotDetected: boolean;
    confidence: number;
    details?: string[];
  };
}

interface ReportData {
  developerName: string;
  userId: string;
  date: string;
  instances: BotDetectionInstance[];
  downloadedBy: string;
  downloadedAt: string;
}

/**
 * Formats a timestamp to a readable time string
 */
function formatTime(timestamp: string, timezone?: string): string {
  const date = new Date(timestamp);
  const tz = timezone || 'UTC';

  return date.toLocaleString('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Generates a CSV report of bot detection instances
 */
export function generateBotDetectionCSV(data: ReportData, timezone?: string): string {
  const lines: string[] = [];

  // Header information
  lines.push('Bot Detection Report');
  lines.push('');
  lines.push(`Developer Name,${data.developerName}`);
  lines.push(`User ID,${data.userId}`);
  lines.push(`Date,${data.date}`);
  lines.push(`Downloaded By,${data.downloadedBy}`);
  lines.push(`Downloaded At,${data.downloadedAt}`);
  lines.push('');
  lines.push('');

  // Table header
  lines.push('Time (Minute),Anomaly Type,Confidence,Reasons');

  // Table rows
  if (data.instances.length === 0) {
    lines.push('No bot detection instances found for this date');
  } else {
    data.instances.forEach(instance => {
      const time = formatTime(instance.periodEnd, timezone);
      const types: string[] = [];

      if (instance.botDetection.keyboardBotDetected) {
        types.push('Keyboard');
      }
      if (instance.botDetection.mouseBotDetected) {
        types.push('Mouse');
      }

      const anomalyType = types.join(' + ');
      const confidence = `${(instance.botDetection.confidence * 100).toFixed(0)}%`;

      // Process reasons to replace key codes with key names
      const processedReasons = processKeyCodesInReasons(instance.botDetection.details || []);
      const reasons = processedReasons.join('; ').replace(/,/g, '|'); // Replace commas to avoid CSV issues

      lines.push(`${time},"${anomalyType}",${confidence},"${reasons}"`);
    });
  }

  return lines.join('\n');
}

/**
 * Generates a formatted text report of bot detection instances
 */
export function generateBotDetectionTextReport(data: ReportData, timezone?: string): string {
  const lines: string[] = [];

  // Header
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('           BOT DETECTION / DEFENSE ACTIVATION REPORT         ');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Developer Name:    ${data.developerName}`);
  lines.push(`User ID:           ${data.userId}`);
  lines.push(`Date:              ${data.date}`);
  lines.push(`Downloaded By:     ${data.downloadedBy}`);
  lines.push(`Downloaded At:     ${data.downloadedAt}`);
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');

  if (data.instances.length === 0) {
    lines.push('✓ No anomalous activity detected for this date.');
    lines.push('');
  } else {
    lines.push(`Total Instances: ${data.instances.length}`);
    lines.push('');

    data.instances.forEach((instance, index) => {
      const time = formatTime(instance.periodEnd, timezone);

      lines.push(`─────────────────────────────────────────────────────────`);
      lines.push(`Instance ${index + 1} of ${data.instances.length}`);
      lines.push(`─────────────────────────────────────────────────────────`);
      lines.push(`Time:              ${time}`);
      lines.push(`Confidence Level:  ${(instance.botDetection.confidence * 100).toFixed(0)}%`);
      lines.push('');

      // Anomaly types
      const types: string[] = [];
      if (instance.botDetection.keyboardBotDetected) {
        types.push('Keyboard Anomaly');
      }
      if (instance.botDetection.mouseBotDetected) {
        types.push('Mouse Anomaly');
      }
      lines.push(`Anomaly Type:      ${types.join(', ')}`);
      lines.push('');

      // Reasons
      if (instance.botDetection.details && instance.botDetection.details.length > 0) {
        lines.push('Suspicious Patterns Detected:');

        // Process reasons to replace key codes with key names
        const processedReasons = processKeyCodesInReasons(instance.botDetection.details);

        processedReasons.forEach((reason, idx) => {
          lines.push(`  ${idx + 1}. ${reason}`);
        });
      } else {
        lines.push('Suspicious Patterns: (details not available)');
      }
      lines.push('');
    });
  }

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('End of Report');
  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Downloads a file with the given content
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
