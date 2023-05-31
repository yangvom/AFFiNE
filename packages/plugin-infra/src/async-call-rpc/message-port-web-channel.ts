import type { EventBasedChannel } from 'async-call-rpc';

export class MessagePortWebChannel implements EventBasedChannel {
  constructor(private port: MessagePort) {}

  on(listener: (data: unknown) => void) {
    const handlePort = (event: MessageEvent) => {
      listener(event.data);
    };
    this.port.addEventListener('message', handlePort);
    this.port.start();
    return () => {
      this.port.removeEventListener('message', handlePort);
      this.port.close();
    };
  }

  send(data: unknown): void {
    this.port.postMessage(data);
  }
}
