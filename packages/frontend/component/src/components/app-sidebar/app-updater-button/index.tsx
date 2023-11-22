import { isBrowser, Unreachable } from '@affine/env/constant';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { CloseIcon, NewIcon, ResetIcon } from '@blocksuite/icons';
import clsx from 'clsx';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { startTransition, useCallback, useState } from 'react';

import { Tooltip } from '../../../ui/tooltip';
import * as styles from './index.css';
import {
  changelogCheckedAtom,
  downloadProgressAtom,
  updateAvailableAtom,
  updateReadyAtom,
} from './index.jotai';

export interface AddPageButtonPureProps {
  onClickUpdate: () => void;
  onDismissCurrentChangelog: () => void;
  currentChangelogUnread: boolean;
  updateReady: boolean;
  updateAvailable: {
    version: string;
    allowAutoUpdate: boolean;
  } | null;
  downloadProgress: number | null;
  appQuitting: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const currentVersionAtom = atom(async () => {
  if (!isBrowser) {
    return null;
  }
  const currentVersion = await window.apis?.updater.currentVersion();
  return currentVersion;
});

const currentChangelogUnreadAtom = atom(async get => {
  if (!isBrowser) {
    return false;
  }
  const mapping = get(changelogCheckedAtom);
  const currentVersion = await get(currentVersionAtom);
  if (currentVersion) {
    return !mapping[currentVersion];
  }
  return false;
});

export function AppUpdaterButtonPure({
  updateReady,
  onClickUpdate,
  onDismissCurrentChangelog,
  currentChangelogUnread,
  updateAvailable,
  downloadProgress,
  appQuitting,
  className,
  style,
}: AddPageButtonPureProps) {
  const t = useAFFiNEI18N();

  if (!updateAvailable && !currentChangelogUnread) {
    return null;
  }

  const updateAvailableNode = updateAvailable
    ? updateAvailable.allowAutoUpdate
      ? renderUpdateAvailableAllowAutoUpdate()
      : renderUpdateAvailableNotAllowAutoUpdate()
    : null;
  const whatsNew =
    !updateAvailable && currentChangelogUnread ? renderWhatsNew() : null;

  const wrapWithTooltip = (
    node: React.ReactElement,
    tooltip?: React.ReactElement | string
  ) => {
    if (!tooltip) {
      return node;
    }

    return (
      <Tooltip content={tooltip} side="top">
        {node}
      </Tooltip>
    );
  };

  return wrapWithTooltip(
    <button
      style={style}
      className={clsx([styles.root, className])}
      data-has-update={!!updateAvailable}
      data-updating={appQuitting}
      data-disabled={
        (updateAvailable?.allowAutoUpdate && !updateReady) || appQuitting
      }
      onClick={onClickUpdate}
    >
      {updateAvailableNode}
      {whatsNew}
      <div className={styles.particles} aria-hidden="true"></div>
      <span className={styles.halo} aria-hidden="true"></span>
    </button>,
    updateAvailable?.version
  );

  function renderUpdateAvailableAllowAutoUpdate() {
    return (
      <div className={clsx([styles.updateAvailableWrapper])}>
        <div className={clsx([styles.installLabelNormal])}>
          <span className={styles.ellipsisTextOverflow}>
            {!updateReady
              ? t['com.affine.appUpdater.downloading']()
              : t['com.affine.appUpdater.updateAvailable']()}
          </span>
          <span className={styles.versionLabel}>
            {updateAvailable?.version}
          </span>
        </div>

        {updateReady ? (
          <div className={clsx([styles.installLabelHover])}>
            <ResetIcon className={styles.icon} />
            <span className={styles.ellipsisTextOverflow}>
              {t[
                appQuitting ? 'Loading' : 'com.affine.appUpdater.installUpdate'
              ]()}
            </span>
          </div>
        ) : (
          <div className={styles.progress}>
            <div
              className={styles.progressInner}
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  function renderUpdateAvailableNotAllowAutoUpdate() {
    return (
      <>
        <div className={clsx([styles.installLabelNormal])}>
          <span className={styles.ellipsisTextOverflow}>
            {t['com.affine.appUpdater.updateAvailable']()}
          </span>
          <span className={styles.versionLabel}>
            {updateAvailable?.version}
          </span>
        </div>

        <div className={clsx([styles.installLabelHover])}>
          <span className={styles.ellipsisTextOverflow}>
            {t['com.affine.appUpdater.openDownloadPage']()}
          </span>
        </div>
      </>
    );
  }

  function renderWhatsNew() {
    return (
      <>
        <div className={clsx([styles.whatsNewLabel])}>
          <NewIcon className={styles.icon} />
          <span className={styles.ellipsisTextOverflow}>
            {t['com.affine.appUpdater.whatsNew']()}
          </span>
        </div>
        <div
          className={styles.closeIcon}
          onClick={e => {
            onDismissCurrentChangelog();
            e.stopPropagation();
          }}
        >
          <CloseIcon />
        </div>
      </>
    );
  }
}

// Although it is called an input, it is actually a button.
export function AppUpdaterButton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const currentChangelogUnread = useAtomValue(currentChangelogUnreadAtom);
  const updateReady = useAtomValue(updateReadyAtom);
  const updateAvailable = useAtomValue(updateAvailableAtom);
  const currentVersion = useAtomValue(currentVersionAtom);
  const downloadProgress = useAtomValue(downloadProgressAtom);
  const setChangelogCheckAtom = useSetAtom(changelogCheckedAtom);
  const [appQuitting, setAppQuitting] = useState(false);

  const onDismissCurrentChangelog = useCallback(() => {
    if (!currentVersion) {
      return;
    }
    startTransition(() =>
      setChangelogCheckAtom(mapping => {
        return {
          ...mapping,
          [currentVersion]: true,
        };
      })
    );
  }, [currentVersion, setChangelogCheckAtom]);
  const onClickUpdate = useCallback(() => {
    if (updateReady) {
      setAppQuitting(true);
      window.apis?.updater.quitAndInstall().catch(err => {
        // TODO: add error toast here
        console.error(err);
      });
    } else if (updateAvailable) {
      if (updateAvailable.allowAutoUpdate) {
        // wait for download to finish
      } else {
        window.open(
          `https://github.com/toeverything/AFFiNE/releases/tag/v${currentVersion}`,
          '_blank'
        );
      }
    } else if (currentChangelogUnread) {
      window.open(runtimeConfig.changelogUrl, '_blank');
      onDismissCurrentChangelog();
    } else {
      throw new Unreachable();
    }
  }, [
    currentChangelogUnread,
    currentVersion,
    onDismissCurrentChangelog,
    updateAvailable,
    updateReady,
  ]);
  return (
    <AppUpdaterButtonPure
      appQuitting={appQuitting}
      updateReady={!!updateReady}
      onClickUpdate={onClickUpdate}
      onDismissCurrentChangelog={onDismissCurrentChangelog}
      currentChangelogUnread={currentChangelogUnread}
      updateAvailable={updateAvailable}
      downloadProgress={downloadProgress}
      className={className}
      style={style}
    />
  );
}

export * from './index.jotai';
