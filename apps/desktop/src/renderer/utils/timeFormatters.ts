/**
 * Formats hours to "Xh Ym" format
 * @param hours - Number of hours (can be decimal)
 * @returns Formatted string like "2h 30m" or "1h 15m"
 */
export function formatHoursToHM(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (wholeHours === 0 && minutes === 0) {
    return '0m';
  }
  
  if (wholeHours === 0) {
    return `${minutes}m`;
  }
  
  if (minutes === 0) {
    return `${wholeHours}h`;
  }
  
  return `${wholeHours}h ${minutes}m`;
}

/**
 * Formats minutes to "Xh Ym" format
 * @param minutes - Number of minutes
 * @returns Formatted string like "2h 30m" or "45m"
 */
export function formatMinutesToHM(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0 && mins === 0) {
    return '0m';
  }
  
  if (hours === 0) {
    return `${mins}m`;
  }
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
}