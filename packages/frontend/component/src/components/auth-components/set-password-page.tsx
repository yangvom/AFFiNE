import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { useSetAtom } from 'jotai';
import type { FC } from 'react';
import { useCallback, useState } from 'react';

import { Button } from '../../ui/button';
import { pushNotificationAtom } from '../notification-center';
import { AuthPageContainer } from './auth-page-container';
import { SetPassword } from './set-password';
import type { User } from './type';

export const SetPasswordPage: FC<{
  user: User;
  onSetPassword: (password: string) => Promise<void>;
  onOpenAffine: () => void;
}> = ({ user: { email }, onSetPassword: propsOnSetPassword, onOpenAffine }) => {
  const t = useAFFiNEI18N();
  const [hasSetUp, setHasSetUp] = useState(false);
  const pushNotification = useSetAtom(pushNotificationAtom);

  const onSetPassword = useCallback(
    (passWord: string) => {
      propsOnSetPassword(passWord)
        .then(() => setHasSetUp(true))
        .catch(e =>
          pushNotification({
            title: t['com.affine.auth.password.set-failed'](),
            message: String(e),
            key: Date.now().toString(),
            type: 'error',
          })
        );
    },
    [propsOnSetPassword, pushNotification, t]
  );

  return (
    <AuthPageContainer
      title={
        hasSetUp
          ? t['com.affine.auth.set.password.page.success']()
          : t['com.affine.auth.set.password.page.title']()
      }
      subtitle={
        hasSetUp ? (
          t['com.affine.auth.sent.set.password.success.message']()
        ) : (
          <>
            {t['com.affine.auth.page.sent.email.subtitle']()}
            <a href={`mailto:${email}`}>{email}</a>
          </>
        )
      }
    >
      {hasSetUp ? (
        <Button type="primary" size="large" onClick={onOpenAffine}>
          {t['com.affine.auth.open.affine']()}
        </Button>
      ) : (
        <SetPassword onSetPassword={onSetPassword} />
      )}
    </AuthPageContainer>
  );
};
