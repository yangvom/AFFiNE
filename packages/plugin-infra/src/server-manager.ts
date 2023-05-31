import { rootStore } from '@affine/workspace/store';

import { affinePluginsAtom } from './atom';
import type { Definition, Loader, PluginRPC } from './type';

export function definePlugin<
  ID extends string,
  ServerSideRPCImpl extends PluginRPC['serverSide']
>(definition: Definition<ID>, serverRPCImpl?: Loader<ServerSideRPCImpl>) {
  const basePlugin = {
    definition,
    uiAdapter: {},
    blockSuiteAdapter: {},
    rpc: {},
  };
  rootStore.set(affinePluginsAtom, plugins => ({
    ...plugins,
    [definition.id]: basePlugin,
  }));

  if (serverRPCImpl) {
    serverRPCImpl.load().then(_ => {
      const serverSideImpl = _.default;
      rootStore.set(affinePluginsAtom, plugins => ({
        ...plugins,
        [definition.id]: {
          ...(plugins[definition.id] ?? basePlugin),
          rpc: {
            ...(plugins[definition.id] ?? basePlugin).rpc,
            serverSide: serverSideImpl,
          },
        },
      }));
    });
  }
}
