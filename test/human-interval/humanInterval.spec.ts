import { describe, expect, it } from 'vitest';
import { humanInterval } from '../../src/human-interval/humanInterval.js';

describe('humanInterval', () => {
  describe('returns undefined for falsy input', () => {
    it.each([
      [undefined, undefined],
      ['', undefined],
    ])('returns undefined for %j', (input, expected) => {
      expect(humanInterval(input as unknown as string)).toBe(expected);
    });
  });

  describe('parses single units', () => {
    it.each([
      ['1 second', 1000],
      ['1 minute', 60_000],
      ['1 hour', 3_600_000],
      ['1 day', 86_400_000],
      ['1 week', 604_800_000],
      ['1 month', 2_592_000_000],
      ['1 year', 31_536_000_000],
    ])('parses "%s"', (input, expected) => {
      expect(humanInterval(input)).toBe(expected);
    });
  });

  describe('parses plural units', () => {
    it.each([
      ['5 seconds', 5000],
      ['10 minutes', 600_000],
      ['2 hours', 7_200_000],
      ['3 days', 259_200_000],
    ])('parses "%s"', (input, expected) => {
      expect(humanInterval(input)).toBe(expected);
    });
  });

  describe('parses compound intervals', () => {
    it.each([
      ['1 minute and 30 seconds', 90_000],
      ['1 hour 30 minutes', 5_400_000],
      ['2 days and 4 hours', 187_200_000],
    ])('parses "%s"', (input, expected) => {
      expect(humanInterval(input)).toBe(expected);
    });
  });

  describe('parses word numbers', () => {
    it.each([
      ['one minute', 60_000],
      ['five seconds', 5000],
      ['twenty-one days', 1_814_400_000],
      ['ten days', 864_000_000],
    ])('parses "%s"', (input, expected) => {
      expect(humanInterval(input)).toBe(expected);
    });
  });

  describe('returns NaN for special inputs', () => {
    it.each([
      ['never'],
      ['not an interval'],
      ['1000'],
    ])('returns NaN for "%s"', (input) => {
      expect(humanInterval(input)).toBeNaN();
    });
  });

  describe('parses negative intervals', () => {
    it.each([['-1 minute', -60_000]])('parses "%s"', (input, expected) => {
      expect(humanInterval(input)).toBe(expected);
    });
  });

  describe('handles implicit quantity of 1', () => {
    it.each([
      ['second', 1000],
      ['minute', 60_000],
    ])('parses "%s" as 1 %s', (input, expected) => {
      expect(humanInterval(input)).toBe(expected);
    });
  });

  describe('parses fractional numbers', () => {
    it.each([['1.5 minutes', 90_000]])('parses "%s"', (input, expected) => {
      expect(humanInterval(input)).toBe(expected);
    });
  });

  describe('parses compound intervals without "and"', () => {
    it.each([['2 hours 30 minutes 10 seconds', 9_010_000]])('parses "%s"', (input, expected) => {
      expect(humanInterval(input)).toBe(expected);
    });
  });

  describe('parses hyphenated word numbers beyond twenty-one', () => {
    it.each([
      ['thirty-five seconds', 35_000],
      ['ninety-nine minutes', 5_940_000],
    ])('parses "%s"', (input, expected) => {
      expect(humanInterval(input)).toBe(expected);
    });
  });

  describe('parses word numbers with large values', () => {
    it.each([
      ['one hundred seconds', 100_000],
      ['one thousand seconds', 1000],
    ])('parses "%s"', (input, expected) => {
      expect(humanInterval(input)).toBe(expected);
    });
  });

  describe('parses word number decimals', () => {
    it.each([['one point five seconds', 1500]])('parses "%s"', (input, expected) => {
      expect(humanInterval(input)).toBe(expected);
    });
  });

  describe('handles edge cases', () => {
    it.each([
      ['0 seconds', 0],
      ['0.5 hours', 1_800_000],
      ['One minute', 0],
    ])('parses "%s" as %d', (input, expected) => {
      expect(humanInterval(input)).toBe(expected);
    });
  });
});
