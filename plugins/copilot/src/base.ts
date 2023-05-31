import type { Definition } from '@toeverything/plugin-infra/type';
import { ReleaseStage } from '@toeverything/plugin-infra/type';

export const definition: Definition<'com.affine.copilot'> = {
  id: 'com.affine.copilot',
  name: {
    fallback: 'AFFiNE Copilot',
    i18nKey: 'com.affine.copilot.name',
  },
  description: {
    fallback:
      'AFFiNE Copilot will help you with best writing experience on the World.',
  },
  publisher: {
    name: {
      fallback: 'AFFiNE',
    },
    link: 'https://affine.pro',
  },
  stage: ReleaseStage.NIGHTLY,
  version: '0.0.1',
};
