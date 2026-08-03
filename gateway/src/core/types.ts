export type Token = symbol;

export interface ProviderContainer {
  register<T>(token: Token, instance: T): void;

  resolve<T>(token: Token): T;
}
