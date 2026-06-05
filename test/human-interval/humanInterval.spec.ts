import { describe, expect, it } from 'vitest';
import { humanInterval } from '../../src/human-interval/humanInterval.js';

describe('humanInterval', () => {
  describe('returns undefined for falsy input', () => {
    it('returns undefined for undefined', () => {
      expect(humanInterval(undefined as unknown as string)).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(humanInterval('')).toBeUndefined();
    });
  });

  describe('parses single units', () => {
    it('parses "1 second"', () => {
      expect(humanInterval('1 second')).toBe(1000);
    });

    it('parses "1 minute"', () => {
      expect(humanInterval('1 minute')).toBe(60_000);
    });

    it('parses "1 hour"', () => {
      expect(humanInterval('1 hour')).toBe(3_600_000);
    });

    it('parses "1 day"', () => {
      expect(humanInterval('1 day')).toBe(86_400_000);
    });

    it('parses "1 week"', () => {
      expect(humanInterval('1 week')).toBe(604_800_000);
    });

    it('parses "1 month"', () => {
      expect(humanInterval('1 month')).toBe(2_592_000_000);
    });

    it('parses "1 year"', () => {
      expect(humanInterval('1 year')).toBe(31_536_000_000);
    });
  });

  describe('parses plural units', () => {
    it('parses "5 seconds"', () => {
      expect(humanInterval('5 seconds')).toBe(5000);
    });

    it('parses "10 minutes"', () => {
      expect(humanInterval('10 minutes')).toBe(600_000);
    });

    it('parses "2 hours"', () => {
      expect(humanInterval('2 hours')).toBe(7_200_000);
    });

    it('parses "3 days"', () => {
      expect(humanInterval('3 days')).toBe(259_200_000);
    });
  });

  describe('parses compound intervals', () => {
    it('parses "1 minute and 30 seconds"', () => {
      expect(humanInterval('1 minute and 30 seconds')).toBe(90_000);
    });

    it('parses "1 hour 30 minutes"', () => {
      expect(humanInterval('1 hour 30 minutes')).toBe(5_400_000);
    });

    it('parses "2 days and 4 hours"', () => {
      expect(humanInterval('2 days and 4 hours')).toBe(187_200_000);
    });
  });

  describe('parses word numbers', () => {
    it('parses "one minute"', () => {
      expect(humanInterval('one minute')).toBe(60_000);
    });

    it('parses "five seconds"', () => {
      expect(humanInterval('five seconds')).toBe(5000);
    });

    it('parses "twenty-one days"', () => {
      expect(humanInterval('twenty-one days')).toBe(1_814_400_000);
    });

    it('parses "ten days"', () => {
      expect(humanInterval('ten days')).toBe(864_000_000);
    });
  });

  describe('parses "never" as NaN', () => {
    it('returns NaN for "never"', () => {
      expect(humanInterval('never')).toBeNaN();
    });
  });

  describe('returns NaN for unparseable strings', () => {
    it('returns NaN for random text', () => {
      expect(humanInterval('not an interval')).toBeNaN();
    });
  });

  describe('parses negative intervals', () => {
    it('parses "-1 minute"', () => {
      expect(humanInterval('-1 minute')).toBe(-60_000);
    });
  });

  describe('handles implicit quantity of 1', () => {
    it('parses "second" as 1 second', () => {
      expect(humanInterval('second')).toBe(1000);
    });

    it('parses "minute" as 1 minute', () => {
      expect(humanInterval('minute')).toBe(60_000);
    });
  });

  describe('parses fractional numbers', () => {
    it('parses "1.5 minutes"', () => {
      expect(humanInterval('1.5 minutes')).toBe(90_000);
    });
  });

  describe('parses numeric strings', () => {
    it('parses "1000" as NaN (no unit)', () => {
      expect(humanInterval('1000')).toBeNaN();
    });
  });

  describe('parses compound intervals without "and"', () => {
    it('parses "2 hours 30 minutes 10 seconds"', () => {
      expect(humanInterval('2 hours 30 minutes 10 seconds')).toBe(9_010_000);
    });
  });

  describe('parses hyphenated word numbers beyond twenty-one', () => {
    it('parses "thirty-five seconds"', () => {
      expect(humanInterval('thirty-five seconds')).toBe(35_000);
    });

    it('parses "ninety-nine minutes"', () => {
      expect(humanInterval('ninety-nine minutes')).toBe(5_940_000);
    });
  });

  describe('parses word numbers with large values', () => {
    it('parses "one hundred seconds"', () => {
      expect(humanInterval('one hundred seconds')).toBe(100_000);
    });

    it('treats "thousand" as containing "and" which gets stripped', () => {
      expect(humanInterval('one thousand seconds')).toBe(1000);
    });
  });

  describe('parses word number decimals', () => {
    it('parses "one point five seconds"', () => {
      expect(humanInterval('one point five seconds')).toBe(1500);
    });
  });

  describe('handles edge cases', () => {
    it('parses "0 seconds"', () => {
      expect(humanInterval('0 seconds')).toBe(0);
    });

    it('parses "0.5 hours"', () => {
      expect(humanInterval('0.5 hours')).toBe(1_800_000);
    });

    it('strips uppercase letters and parses remaining text (uppercase "One" becomes "ne" → 0)', () => {
      expect(humanInterval('One minute')).toBe(0);
    });
  });
});
