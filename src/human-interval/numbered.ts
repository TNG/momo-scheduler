// Vendored from numbered v1.1.0 (MIT License)
// https://github.com/blakeembrey/node-numbered

const NUMBER_MAP: Record<string, string> = {
  '.': 'point',
  '-': 'negative',
  0: 'zero',
  1: 'one',
  2: 'two',
  3: 'three',
  4: 'four',
  5: 'five',
  6: 'six',
  7: 'seven',
  8: 'eight',
  9: 'nine',
  10: 'ten',
  11: 'eleven',
  12: 'twelve',
  13: 'thirteen',
  14: 'fourteen',
  15: 'fifteen',
  16: 'sixteen',
  17: 'seventeen',
  18: 'eighteen',
  19: 'nineteen',
  20: 'twenty',
  30: 'thirty',
  40: 'forty',
  50: 'fifty',
  60: 'sixty',
  70: 'seventy',
  80: 'eighty',
  90: 'ninety',
};

const CARDINAL_MAP: Record<number, string> = {
  2: 'hundred',
  3: 'thousand',
  6: 'million',
  9: 'billion',
  12: 'trillion',
  15: 'quadrillion',
  18: 'quintillion',
  21: 'sextillion',
  24: 'septillion',
  27: 'octillion',
  30: 'nonillion',
  33: 'decillion',
  36: 'undecillion',
  39: 'duodecillion',
  42: 'tredecillion',
  45: 'quattuordecillion',
  48: 'quindecillion',
  51: 'sexdecillion',
  54: 'septendecillion',
  57: 'octodecillion',
  60: 'novemdecillion',
  63: 'vigintillion',
  100: 'googol',
  303: 'centillion',
};

const WORD_MAP: Record<string, number | string> = {
  nil: 0,
  naught: 0,
  period: '.',
  decimal: '.',
};

for (const [num, word] of Object.entries(NUMBER_MAP)) {
  WORD_MAP[word] = Number.isNaN(Number(num)) ? num : Number(num);
}

for (const [num, word] of Object.entries(CARDINAL_MAP)) {
  WORD_MAP[word] = Number.isNaN(Number(num)) ? num : 10 ** Number(num);
}

function intervals(num: number): number {
  const match = String(num).match(/e\+(\d+)/);
  if (match) return Number(match[1]);
  return String(num).length - 1;
}

function totalStack(stack: number[], largest: number): number {
  const total = stack.reduceRight((prev, num, index) => {
    const next = stack[index + 1];
    if (next !== undefined && num > next) {
      return prev * num;
    }
    return prev + num;
  }, 0);
  return total * largest;
}

const DECIMAL_POINT = '.';
const MINUS_SIGN = '-';

type Token = number | typeof DECIMAL_POINT;

function tokenize(input: string, onMinus: () => void): Token[] {
  return input
    .split(/\W+/g)
    .map((word) => {
      const lower = word.toLowerCase();
      const mapped = WORD_MAP[lower];
      return mapped !== undefined ? mapped : lower;
    })
    .filter((token): token is Token => {
      if (token === MINUS_SIGN) {
        onMinus();
        return false;
      }
      if (token === DECIMAL_POINT) return true;
      return typeof token === 'number';
    });
}

export function parse(input: string): number {
  let modifier = 1;
  const tokens = tokenize(input, () => {
    modifier = -1;
  });

  let largest = 0;
  let largestInterval = 0;
  let zeros = 0;
  const stack: number[] = [];

  let total = 0;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    if (typeof token === 'number') {
      const interval = intervals(token);
      if (interval < largestInterval) {
        stack.push(token);
        if (stack.length === 1) {
          total -= largest;
          continue;
        }
        continue;
      }
    }
    total += totalStack(stack, largest);
    stack.length = 0;

    if (token === DECIMAL_POINT) {
      const decimals = zeros + String(total).length;
      zeros = 0;
      largest = 0;
      largestInterval = 0;
      total = total * 10 ** -decimals;
      continue;
    }

    if (typeof token === 'number') {
      if (token === 0) {
        zeros += 1;
        continue;
      }
      const interval = intervals(token);
      if (total >= 1 && interval === largestInterval) {
        let output = '';
        while (zeros > 0) {
          zeros -= 1;
          output += '0';
        }
        total = Number(String(token) + output + String(total));
        continue;
      }
      largest = token;
      largestInterval = intervals(largest);
      total = (total + token) * 10 ** zeros;
    }
  }

  return modifier * (total + totalStack(stack, largest));
}

/*

Node-numbered License (19.06.2026) https://github.com/blakeembrey/node-numbered

MIT

 */
