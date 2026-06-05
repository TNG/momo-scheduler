// Vendored from human-interval v2.0.1 (MIT License)
// https://github.com/agenda/human-interval
// Vendored from numbered v1.1.0 (MIT License)
// https://github.com/blakeembrey/node-numbered

import { parse as parseNumber } from './numbered.js';

const units: Record<string, number> = {};
units.second = 1000;
units.minute = units.second * 60;
units.hour = units.minute * 60;
units.day = units.hour * 24;
units.week = units.day * 7;
units.month = units.day * 30;
units.year = units.day * 365;

const regexp = /(second|minute|hour|day|week|month|year)s?/;

export function humanInterval(time: string): number | undefined;
export function humanInterval(time: undefined): undefined;
export function humanInterval(time: string | undefined): number | undefined;
export function humanInterval(time: string | undefined): number | undefined {
  if (!time) {
    return undefined;
  }

  let result = Number.NaN;

  let remaining = time.replace(/([^a-z\d.-]|and)+/g, ' ');

  for (;;) {
    const match = remaining.match(regexp);
    if (!match || match.index === undefined) {
      return result;
    }

    const matchedNumber = remaining.slice(0, match.index).trim();
    const unit = match[1] !== undefined ? units[match[1]] : undefined;

    if (unit === undefined) {
      return result;
    }

    let number = 1;
    if (matchedNumber.length > 0) {
      number = Number.parseFloat(matchedNumber);
      if (Number.isNaN(number)) {
        number = parseNumber(matchedNumber);
      }
    }

    if (Number.isNaN(result)) {
      result = 0;
    }

    result += number * unit;
    remaining = remaining.slice(match.index + match[0].length);
  }
}
