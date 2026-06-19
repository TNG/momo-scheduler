// Vendored replacement for the `typed-emitter` npm package, which is CJS-only
// and incompatible with verbatimModuleSyntax + moduleResolution: nodenext.
// Provides the same typed EventEmitter interface without requiring a CJS dependency.

// biome-ignore lint/suspicious/noExplicitAny: typed-emitter replacement requires any in conditional types
type Arguments<T> = T extends (...args: infer A) => any ? A : never;

// biome-ignore lint/suspicious/noExplicitAny: typed-emitter replacement requires any in generic constraint
export interface TypedEmitter<T extends Record<string, (...args: any[]) => any>>
  extends NodeJS.EventEmitter {
  addListener<K extends keyof T & string>(eventName: K, listener: T[K]): this;

  on<K extends keyof T & string>(eventName: K, listener: T[K]): this;

  once<K extends keyof T & string>(eventName: K, listener: T[K]): this;

  prependListener<K extends keyof T & string>(
    eventName: K,
    listener: T[K],
  ): this;

  prependOnceListener<K extends keyof T & string>(
    eventName: K,
    listener: T[K],
  ): this;

  removeListener<K extends keyof T & string>(
    eventName: K,
    listener: T[K],
  ): this;

  off<K extends keyof T & string>(eventName: K, listener: T[K]): this;

  emit<K extends keyof T & string>(
    eventName: K,
    ...args: Arguments<T[K]>
  ): boolean;
}

/*

Typed-emitter License (19.06.2026) https://github.com/andywer/typed-emitter

The MIT License (MIT)

Copyright (c) 2018 Andy Wermke

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

 */
