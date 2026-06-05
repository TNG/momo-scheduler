import { describe, expect, it } from 'vitest';
import {
  numbered,
  parse,
  stringify,
} from '../../src/human-interval/numbered.js';

describe('parse', () => {
  describe('parses single digit word numbers', () => {
    it('parses "zero"', () => {
      expect(parse('zero')).toBe(0);
    });

    it('parses "one"', () => {
      expect(parse('one')).toBe(1);
    });

    it('parses "nine"', () => {
      expect(parse('nine')).toBe(9);
    });
  });

  describe('parses teen numbers', () => {
    it('parses "ten"', () => {
      expect(parse('ten')).toBe(10);
    });

    it('parses "eleven"', () => {
      expect(parse('eleven')).toBe(11);
    });

    it('parses "nineteen"', () => {
      expect(parse('nineteen')).toBe(19);
    });
  });

  describe('parses tens', () => {
    it('parses "twenty"', () => {
      expect(parse('twenty')).toBe(20);
    });

    it('parses "fifty"', () => {
      expect(parse('fifty')).toBe(50);
    });

    it('parses "ninety"', () => {
      expect(parse('ninety')).toBe(90);
    });
  });

  describe('parses hyphenated numbers', () => {
    it('parses "twenty-one"', () => {
      expect(parse('twenty-one')).toBe(21);
    });

    it('parses "thirty-five"', () => {
      expect(parse('thirty-five')).toBe(35);
    });

    it('parses "ninety-nine"', () => {
      expect(parse('ninety-nine')).toBe(99);
    });
  });

  describe('parses large numbers', () => {
    it('parses "one hundred"', () => {
      expect(parse('one hundred')).toBe(100);
    });

    it('parses "two thousand"', () => {
      expect(parse('two thousand')).toBe(2000);
    });

    it('parses "one million"', () => {
      expect(parse('one million')).toBe(1_000_000);
    });
  });

  describe('parses compound large numbers', () => {
    it('parses "one hundred and twenty-three"', () => {
      expect(parse('one hundred and twenty-three')).toBe(123);
    });

    it('parses "two thousand and one"', () => {
      expect(parse('two thousand and one')).toBe(2001);
    });
  });

  describe('parses negative numbers', () => {
    it('parses "negative five"', () => {
      expect(parse('negative five')).toBe(-5);
    });
  });

  describe('parses alternative words', () => {
    it('parses "nil" as 0', () => {
      expect(parse('nil')).toBe(0);
    });

    it('parses "naught" as 0', () => {
      expect(parse('naught')).toBe(0);
    });
  });

  describe('parses decimal word numbers', () => {
    it('parses "one point five"', () => {
      expect(parse('one point five')).toBe(1.5);
    });

    it('parses "two point zero five"', () => {
      expect(parse('two point zero five')).toBeCloseTo(2.05);
    });
  });
});

describe('stringify', () => {
  describe('stringifies single digit numbers', () => {
    it('stringifies 0', () => {
      expect(stringify(0)).toBe('zero');
    });

    it('stringifies 5', () => {
      expect(stringify(5)).toBe('five');
    });
  });

  describe('stringifies teen numbers', () => {
    it('stringifies 10', () => {
      expect(stringify(10)).toBe('ten');
    });

    it('stringifies 13', () => {
      expect(stringify(13)).toBe('thirteen');
    });
  });

  describe('stringifies hyphenated tens', () => {
    it('stringifies 21', () => {
      expect(stringify(21)).toBe('twenty-one');
    });

    it('stringifies 99', () => {
      expect(stringify(99)).toBe('ninety-nine');
    });
  });

  describe('stringifies large numbers', () => {
    it('stringifies 100', () => {
      expect(stringify(100)).toBe('one hundred');
    });

    it('stringifies 1000', () => {
      expect(stringify(1000)).toBe('one thousand');
    });
  });

  describe('stringifies negative numbers', () => {
    it('stringifies -1', () => {
      expect(stringify(-1)).toBe('negative one');
    });
  });

  describe('stringifies decimal numbers', () => {
    it('stringifies 1.5', () => {
      expect(stringify(1.5)).toBe('one point five');
    });
  });
});

describe('numbered', () => {
  it('parses a string to a number', () => {
    expect(numbered('twenty-one')).toBe(21);
  });

  it('stringifies a number to a string', () => {
    expect(numbered(21)).toBe('twenty-one');
  });

  it('throws for unsupported types', () => {
    expect(() => numbered(true as unknown as number)).toThrow(
      'Numbered can only parse strings or stringify numbers',
    );
  });
});
