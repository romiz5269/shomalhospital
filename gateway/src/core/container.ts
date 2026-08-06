import type { ProviderContainer, Token } from "./types.js";

class Container implements ProviderContainer {
  private readonly dependencies = new Map<Token, unknown>();

  register<T>(token: Token, instance: T) {
    this.dependencies.set(token, instance);
  }

  resolve<T>(token: Token): T {
    const dependency = this.dependencies.get(token);

    if (!dependency) {
      throw new Error(`Dependency not found: ${String(token)}`);
    }

    return dependency as T;
  }
}

export const container = new Container();
