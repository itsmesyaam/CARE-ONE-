import { describe, it, expect } from 'vitest';
import {
  getKolkataDateLine,
  getKolkataHour,
  getKolkataGreetingKey,
  formatKolkataTime,
} from '../../src/lib/datetime';

describe('Asia/Kolkata DateTime and Greeting Utilities', () => {
  it('formats current date line in Asia/Kolkata for en and ml', () => {
    // Fixed date: Friday, Oct 16 2026, 12:45 UTC = 18:15 IST
    const fixed = new Date('2026-10-16T12:45:00.000Z');
    const enLine = getKolkataDateLine('en', fixed);
    const mlLine = getKolkataDateLine('ml', fixed);

    expect(enLine).toContain('16');
    expect(enLine).toContain('October');
    expect(enLine).toContain('Friday');

    expect(mlLine).toContain('16');
    expect(mlLine.length).toBeGreaterThan(5);
  });

  it('determines greeting based on Asia/Kolkata hour', () => {
    // 09:00 IST = 03:30 UTC -> morning
    const morning = new Date('2026-10-16T03:30:00.000Z');
    expect(getKolkataHour(morning)).toBe(9);
    expect(getKolkataGreetingKey(morning)).toBe('morning');

    // 13:30 IST = 08:00 UTC -> afternoon
    const afternoon = new Date('2026-10-16T08:00:00.000Z');
    expect(getKolkataHour(afternoon)).toBe(13);
    expect(getKolkataGreetingKey(afternoon)).toBe('afternoon');

    // 18:00 IST = 12:30 UTC -> evening
    const evening = new Date('2026-10-16T12:30:00.000Z');
    expect(getKolkataHour(evening)).toBe(18);
    expect(getKolkataGreetingKey(evening)).toBe('evening');
  });

  it('formats appointment time correctly in Asia/Kolkata', () => {
    // 04:00 UTC = 09:30 AM IST
    const appt = '2026-10-16T04:00:00.000Z';
    const formatted = formatKolkataTime(appt);
    expect(formatted.time).toBe('09:30');
    expect(formatted.period).toBe('AM');

    // 08:45 UTC = 02:15 PM IST
    const afternoonAppt = '2026-10-16T08:45:00.000Z';
    const formattedAfternoon = formatKolkataTime(afternoonAppt);
    expect(formattedAfternoon.time).toBe('02:15');
    expect(formattedAfternoon.period).toBe('PM');
  });
});
