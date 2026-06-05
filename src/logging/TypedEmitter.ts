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
