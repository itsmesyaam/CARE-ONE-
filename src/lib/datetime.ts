/**
 * Asia/Kolkata timezone utilities for CareOne Hospital Platform.
 * All clinical timestamps, greetings, and UI displays follow Asia/Kolkata time.
 */

export function getKolkataDateLine(locale = 'en', date: Date = new Date()): string {
  const loc = locale === 'ml' ? 'ml-IN' : 'en-IN';
  return new Intl.DateTimeFormat(loc, {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

export function getKolkataHour(date: Date = new Date()): number {
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    hourCycle: 'h23',
  }).format(date);
  return parseInt(hourStr, 10);
}

export function getKolkataGreetingKey(date: Date = new Date()): 'morning' | 'afternoon' | 'evening' {
  const hour = getKolkataHour(date);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function formatKolkataTime(dateStrOrObj: string | Date): { time: string; period: string } {
  const d = typeof dateStrOrObj === 'string' ? new Date(dateStrOrObj) : dateStrOrObj;
  if (isNaN(d.getTime())) {
    return { time: '09:30', period: 'AM' };
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(d);

  const hour = parts.find((p) => p.type === 'hour')?.value || '09';
  const minute = parts.find((p) => p.type === 'minute')?.value || '30';
  const period = parts.find((p) => p.type === 'dayPeriod')?.value?.toUpperCase() || 'AM';

  return { time: `${hour}:${minute}`, period };
}
