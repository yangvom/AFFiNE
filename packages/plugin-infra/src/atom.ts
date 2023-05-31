import { atom } from 'jotai';

import type { AffinePlugin, PluginAsyncCall } from './type';

// todo: for now every plugin is enabled by default
export const affinePluginsAtom = atom<
  Record<string, AffinePlugin<string, PluginAsyncCall>>
>({});
