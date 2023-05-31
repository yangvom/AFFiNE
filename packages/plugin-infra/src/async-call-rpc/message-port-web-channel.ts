import type { EventBasedChannel } from 'async-call-rpc';

export class MessagePortWebChannel implements EventBasedChannel {
  #port: MessagePort | null = null;
  constructor() {}

  #callbackCache = new Set<(data: unknown) => void>();
  #dataCache: unknown[] = [];

  get port(): MessagePort | null {
    return this.#port;
  }

  set port(port: MessagePort | null) {
    if (this.#callbackCache.size > 0) {
      this.#callbackCache.forEach(callback => {
        port!.addEventListener('message', callback);
      });
      this.#callbackCache.clear();
    }
    if (this.#dataCache.length > 0) {
      this.#dataCache.forEach(data => {
        this.port!.postMessage(data);
      });
      this.#dataCache = [];
    }
    this.#port = port;
    this.#port!.start();
  }

  on(listener: (data: unknown) => void) {
    const handlePort = (event: MessageEvent) => {
      listener(event.data);
    };
    if (!this.port) {
      this.#callbackCache.add(listener);
      return () => {
        if (this.#callbackCache.has(listener)) {
          this.#callbackCache.delete(listener);
        } else {
          this.port!.removeEventListener('message', handlePort);
          this.port!.close();
        }
      };
    }
    this.port.addEventListener('message', handlePort);
    this.port.start();
    return () => {
      this.port!.removeEventListener('message', handlePort);
      this.port!.close();
    };
  }

  send(data: unknown): void {
    if (!this.port) {
      this.#dataCache.push(data);
      return;
    }
    this.port.postMessage(data);
  }
}
