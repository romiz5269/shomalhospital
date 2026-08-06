export type ShutdownHook = () => Promise<void>;

class ShutdownHooks {
  private readonly hooks: ShutdownHook[] = [];

  register(hook: ShutdownHook) {
    this.hooks.push(hook);
  }

  async execute() {
    for (const hook of this.hooks) {
      await hook();
    }
  }
}

export const shutdownHooks = new ShutdownHooks();
