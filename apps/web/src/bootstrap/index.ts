import { config, setupGlobal } from '@affine/env';
import { pluginMessagePorts } from '@toeverything/plugin-infra/manager';

setupGlobal();

if (!environment.isServer) {
  window.addEventListener('message', event => {
    if (event.source === window && event.data === 'plugin-port') {
      const [port] = event.ports;
      const handleMessage = (message: MessageEvent) => {
        if (typeof message.data === 'string') {
          const [plugin, id] = message.data.split(':');
          if (plugin === 'plugin') {
            pluginMessagePorts[id] = port;
            port.removeEventListener('message', handleMessage);
          }
        }
      };
      port.addEventListener('message', handleMessage);
    }
  });
}

if (config.enablePlugin && !environment.isServer) {
  import('@affine/copilot');
}

if (!environment.isServer) {
  import('@affine/bookmark-block');
}
