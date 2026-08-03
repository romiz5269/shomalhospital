import { AsyncLocalStorage } from "node:async_hooks";
import type { RequestContext } from "./context.js";

class RequestContextStorage {
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  run(context: RequestContext, callback: () => void) {
    this.storage.run(context, callback);
  }

  get() {
    return this.storage.getStore();
  }

  enter(context: RequestContext) {
    this.storage.enterWith(context);
  }

  disable() {
    this.storage.disable();
  }
}

export const requestContext = new RequestContextStorage();
