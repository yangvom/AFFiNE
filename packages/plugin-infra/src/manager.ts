import { rootStore } from '@affine/workspace/store';
import { AsyncCall } from 'async-call-rpc';

import { MessagePortWebChannel } from './async-call-rpc/message-port-web-channel';
import { affinePluginsAtom } from './atom';
import type { Definition, PluginRPC } from './type';
import type { Loader, PluginUIAdapter } from './type';
import type { PluginBlockSuiteAdapter } from './type';

export const pluginMessagePorts: Record<string, MessagePort> = {};

const pluginLogger = console;

export function definePlugin<
  ID extends string,
  ServerSideRPCImpl extends PluginRPC['serverSide'],
  UISideRPCImpl extends PluginRPC['uiSide']
>(
  definition: Definition<ID>,
  uiAdapterLoader?: Loader<Partial<PluginUIAdapter<ServerSideRPCImpl>>>,
  blockSuiteAdapter?: Loader<
    Partial<PluginBlockSuiteAdapter<ServerSideRPCImpl>>
  >,
  uiRPCImpl?: Loader<UISideRPCImpl>
) {
  const basePlugin = {
    definition,
    uiAdapter: {},
    blockSuiteAdapter: {},
    rpc: {
      uiSide: {},
      serverSide: {},
    },
  };

  rootStore.set(affinePluginsAtom, plugins => ({
    ...plugins,
    [definition.id]: basePlugin,
  }));

  if (uiRPCImpl && !environment.isServer) {
    const updateUISideRPC = (uiSide: PluginRPC['uiSide']) => {
      rootStore.set(affinePluginsAtom, plugins => ({
        ...plugins,
        [definition.id]: {
          ...(plugins[definition.id] ?? basePlugin),
          rpc: {
            ...(plugins[definition.id] ?? basePlugin).rpc,
            uiSide,
          },
        },
      }));
    };

    uiRPCImpl.load().then(({ default: rpc }) => updateUISideRPC(rpc));

    if (import.meta.webpackHot) {
      uiRPCImpl.hotModuleReload(async _ => {
        const rpc = (await _).default;
        updateUISideRPC(rpc);
        pluginLogger.info('[HMR] Plugin', definition.id, 'hot reloaded.');
      });
    }
  }

  const updateServerSideRPC = (serverSide: PluginRPC['serverSide']) => {
    rootStore.set(affinePluginsAtom, plugins => ({
      ...plugins,
      [definition.id]: {
        ...(plugins[definition.id] ?? basePlugin),
        rpc: {
          ...(plugins[definition.id] ?? basePlugin).rpc,
          serverSide,
        },
      },
    }));
  };

  if (!environment.isServer) {
    updateServerSideRPC(
      AsyncCall(
        {},
        {
          channel: new Promise<MessagePortWebChannel>(resolve => {
            if (pluginMessagePorts[definition.id]) {
              console.log('register');
              resolve(
                new MessagePortWebChannel(pluginMessagePorts[definition.id])
              );
            } else {
              const handleWindowMessage = (event: MessageEvent) => {
                if (event.source === window && event.data === 'plugin-port') {
                  const [port] = event.ports;
                  const handleMessage = (message: MessageEvent) => {
                    if (typeof message.data === 'string') {
                      const [plugin, id] = message.data.split(':');
                      if (plugin === 'plugin' && id === definition.id) {
                        port.removeEventListener('message', handleMessage);
                        window.removeEventListener(
                          'message',
                          handleWindowMessage
                        );
                        console.log('register2');
                        resolve(new MessagePortWebChannel(port));
                      }
                    }
                  };
                  port.addEventListener('message', handleMessage);
                }
              };
              window.addEventListener('message', handleWindowMessage);
            }
          }),
        }
      )
    );
  }

  if (blockSuiteAdapter && !environment.isServer) {
    const updateAdapter = (
      adapter: Partial<PluginBlockSuiteAdapter<ServerSideRPCImpl>>
    ) => {
      rootStore.set(affinePluginsAtom, plugins => ({
        ...plugins,
        [definition.id]: {
          ...(plugins[definition.id] ?? basePlugin),
          blockSuiteAdapter: adapter as any,
        },
      }));
    };

    blockSuiteAdapter
      .load()
      .then(({ default: adapter }) => updateAdapter(adapter));

    if (import.meta.webpackHot) {
      blockSuiteAdapter.hotModuleReload(async _ => {
        const adapter = (await _).default;
        updateAdapter(adapter);
        pluginLogger.info('[HMR] Plugin', definition.id, 'hot reloaded.');
      });
    }
  }

  if (uiAdapterLoader && !environment.isServer) {
    const updateAdapter = (
      adapter: Partial<PluginUIAdapter<ServerSideRPCImpl>>
    ) => {
      rootStore.set(affinePluginsAtom, plugins => ({
        ...plugins,
        [definition.id]: {
          ...(plugins[definition.id] ?? basePlugin),
          uiAdapter: adapter as any,
        },
      }));
    };

    uiAdapterLoader
      .load()
      .then(({ default: adapter }) => updateAdapter(adapter));

    if (import.meta.webpackHot) {
      uiAdapterLoader.hotModuleReload(async _ => {
        const adapter = (await _).default;
        updateAdapter(adapter);
        pluginLogger.info('[HMR] Plugin', definition.id, 'hot reloaded.');
      });
    }
  }
}
