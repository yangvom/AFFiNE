import { DebugLogger } from '@affine/debug';
import { rootStore } from '@affine/workspace/atom';
import { atom } from 'jotai';

import type { AffinePlugin, Definition, PluginRPC } from './type';
import type { Loader, PluginUIAdapter } from './type';
import type { PluginBlockSuiteAdapter } from './type';

// todo: for now every plugin is enabled by default
export const affinePluginsAtom = atom<Record<string, AffinePlugin<string>>>({});

const pluginLogger = new DebugLogger('affine:plugin');

export function definePlugin<ID extends string>(
  definition: Definition<ID>,
  uiAdapterLoader?: Loader<Partial<PluginUIAdapter>>,
  blockSuiteAdapter?: Loader<Partial<PluginBlockSuiteAdapter>>,
  serverRPCImpl?: Loader<PluginRPC['serverSide']>,
  uiRPCImpl?: Loader<PluginRPC['uiSide']>
) {
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

  if (uiRPCImpl) {
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

  if (serverRPCImpl) {
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

    serverRPCImpl.load().then(({ default: rpc }) => updateServerSideRPC(rpc));

    if (import.meta.webpackHot) {
      serverRPCImpl.hotModuleReload(async _ => {
        const rpc = (await _).default;
        updateServerSideRPC(rpc);
        pluginLogger.info('[HMR] Plugin', definition.id, 'hot reloaded.');
      });
    }
  }

  if (blockSuiteAdapter) {
    const updateAdapter = (adapter: Partial<PluginBlockSuiteAdapter>) => {
      rootStore.set(affinePluginsAtom, plugins => ({
        ...plugins,
        [definition.id]: {
          ...(plugins[definition.id] ?? basePlugin),
          blockSuiteAdapter: adapter,
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

  if (uiAdapterLoader) {
    const updateAdapter = (adapter: Partial<PluginUIAdapter>) => {
      rootStore.set(affinePluginsAtom, plugins => ({
        ...plugins,
        [definition.id]: {
          ...(plugins[definition.id] ?? basePlugin),
          uiAdapter: adapter,
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
