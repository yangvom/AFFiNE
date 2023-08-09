import { AuthInput, ModalHeader } from '@affine/component/auth-components';
import { isDesktop } from '@affine/env/constant';
import { getUserQuery } from '@affine/graphql';
import { Trans } from '@affine/i18n';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { useMutation } from '@affine/workspace/affine/gql';
import { ArrowDownBigIcon, GoogleDuotoneIcon } from '@blocksuite/icons';
import { Button } from '@toeverything/components/button';
import { signIn } from 'next-auth/react';
import { type FC, useState } from 'react';
import { useCallback } from 'react';

import { emailRegex } from '../../../utils/email-regex';
import type { AuthPanelProps } from './index';
import * as style from './style.css';

function validateEmail(email: string) {
  return emailRegex.test(email);
}

export const SignIn: FC<AuthPanelProps> = ({
  setAuthState,
  setAuthEmail,
  email,
}) => {
  const t = useAFFiNEI18N();

  const { trigger: verifyUser, isMutating } = useMutation({
    mutation: getUserQuery,
  });
  const [isValidEmail, setIsValidEmail] = useState(true);

  const onContinue = useCallback(async () => {
    if (!validateEmail(email)) {
      setIsValidEmail(false);
      return;
    }

    setIsValidEmail(true);
    const res = await verifyUser({ email: email });

    setAuthEmail(email);
    if (res?.user) {
      signIn('email', {
        email: email,
        callbackUrl: `/auth/signIn?isClient=${isDesktop ? 'true' : 'false'}`,
        redirect: true,
      }).catch(console.error);

      setAuthState('afterSignInSendEmail');
    } else {
      signIn('email', {
        email: email,
        callbackUrl: `/auth/signUp?isClient=${isDesktop ? 'true' : 'false'}`,
        redirect: true,
      }).catch(console.error);

      setAuthState('afterSignUpSendEmail');
    }
  }, [email, setAuthEmail, setAuthState, verifyUser]);
  return (
    <>
      <ModalHeader
        title={t['com.affine.auth.sign.in']()}
        subTitle={t['AFFiNE Cloud']()}
      />

      <Button
        type="primary"
        block
        size="extraLarge"
        style={{
          marginTop: 30,
        }}
        icon={<GoogleDuotoneIcon />}
        onClick={useCallback(() => {
          signIn('google').catch(console.error);
        }, [])}
      >
        {t['Continue with Google']()}
      </Button>

      <div className={style.authModalContent}>
        <AuthInput
          label={t['com.affine.settings.email']()}
          placeholder={t['com.affine.auth.sign.email.placeholder']()}
          value={email}
          onChange={useCallback(
            (value: string) => {
              setAuthEmail(value);
            },
            [setAuthEmail]
          )}
          error={!isValidEmail}
          errorHint={
            isValidEmail ? '' : t['com.affine.auth.sign.email.error']()
          }
          onEnter={onContinue}
        />

        <Button
          size="extraLarge"
          block
          loading={isMutating}
          icon={
            <ArrowDownBigIcon
              width={20}
              height={20}
              style={{
                transform: 'rotate(-90deg)',
                color: 'var(--affine-blue)',
              }}
            />
          }
          iconPosition="end"
          onClick={onContinue}
        >
          {t['com.affine.auth.sign.email.continue']()}
        </Button>

        <div className={style.authMessage}>
          {/*prettier-ignore*/}
          <Trans i18nKey="com.affine.auth.sign.message">
              By clicking &quot;Continue with Google/Email&quot; above, you acknowledge that
              you agree to AFFiNE&apos;s <a href="https://affine.pro/terms" target="_blank" rel="noreferrer">Terms of Conditions</a> and <a href="https://affine.pro/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.
            </Trans>
        </div>
      </div>
    </>
  );
};