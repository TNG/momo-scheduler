import { describe, expect, it } from 'vitest';
import {
  numbered,
  parse,
  stringify,
} from '../../src/human-interval/numbered.js';

describe('parse', () => {
  it.each([
    ['zero', 0],
    ['one', 1],
    ['nine', 9],
    ['ten', 10],
    ['eleven', 11],
    ['nineteen', 19],
    ['twenty', 20],
    ['fifty', 50],
    ['ninety', 90],
    ['twenty-one', 21],
    ['thirty-five', 35],
    ['ninety-nine', 99],
    ['one hundred', 100],
    ['two thousand', 2000],
    ['one million', 1_000_000],
    ['one hundred and twenty-three', 123],
    ['two thousand and one', 2001],
    ['negative five', -5],
    ['nil', 0],
    ['naught', 0],
    ['one point five', 1.5],
  ])('parses "%s" as %d', (input, expected) => {
    expect(parse(input)).toBe(expected);
  });

  it('parses "two point zero five" as approximately 2.05', () => {
    expect(parse('two point zero five')).toBeCloseTo(2.05);
  });
});

describe('stringify', () => {
  it.each([
    [0, 'zero'],
    [5, 'five'],
    [10, 'ten'],
    [13, 'thirteen'],
    [21, 'twenty-one'],
    [99, 'ninety-nine'],
    [100, 'one hundred'],
    [1000, 'one thousand'],
    [-1, 'negative one'],
    [1.5, 'one point five'],
  ])('stringifies %d as "%s"', (input, expected) => {
    expect(stringify(input)).toBe(expected);
  });
});

describe('numbered', () => {
  it('throws for unsupported types', () => {
    expect(() => numbered(true as unknown as number)).toThrow(
      'Numbered can only parse strings or stringify numbers',
    );
  });
});
