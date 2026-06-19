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

/*

Human-interval License (19.06.2026) https://github.com/agenda/human-interval

## License
(The MIT License)

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the 'Software'), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/*

Node-numbered License (19.06.2026) https://github.com/blakeembrey/node-numbered

MIT

 */
