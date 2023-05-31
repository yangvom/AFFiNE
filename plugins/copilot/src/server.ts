import { definePlugin } from '@toeverything/plugin-infra/server-manager';

import { definition } from './base';

definePlugin(definition, {
  load: () => import('./server/index'),
  hotModuleReload: onHot => onHot(import('./server/index')),
});
