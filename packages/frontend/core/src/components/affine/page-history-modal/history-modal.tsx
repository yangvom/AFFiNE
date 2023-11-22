import { BlockSuiteEditor } from '@affine/component/block-suite-editor';
import type { PageMode } from '@affine/core/atoms';
import {
  fetchWithTraceReport,
  type ListHistoryQuery,
  listHistoryQuery,
  recoverDocMutation,
} from '@affine/graphql';
import { useMutation, useQuery } from '@affine/workspace/affine/gql';
import { createCloudBlobStorage } from '@affine/workspace/blob/cloud-blob-storage';
import { createStaticStorage } from '@affine/workspace/blob/local-static-storage';
import { createSQLiteStorage } from '@affine/workspace/blob/sqlite-blob-storage';
import { globalBlockSuiteSchema } from '@affine/workspace/manager';
import {
  createIndexeddbStorage,
  type StoreOptions,
  Workspace,
} from '@blocksuite/store';
import { Modal } from '@toeverything/components/modal';
import { useAsyncCallback } from '@toeverything/hooks/affine-async-hooks';
import { useBlockSuiteWorkspacePage } from '@toeverything/hooks/use-block-suite-workspace-page';
import { revertUpdate } from '@toeverything/y-indexeddb';
import { type PropsWithChildren, useMemo, useState } from 'react';
import useSWRImmutable from 'swr/immutable';
import { applyUpdate } from 'yjs';

import { AffineErrorBoundary } from '../affine-error-boundary';
import * as styles from './styles.css';

export interface PageHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: Workspace;
  pageId: string;
}

const ModalContainer = ({
  onOpenChange,
  open,
  children,
}: PropsWithChildren<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) => {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      width="calc(100% - 64px)"
      height="80%"
      contentOptions={{
        ['data-testid' as string]: 'page-history-modal',
        style: { padding: '44px 40px 0' },
      }}
    >
      <AffineErrorBoundary>{children}</AffineErrorBoundary>
    </Modal>
  );
};

type DocHistory = ListHistoryQuery['workspace']['histories'][number];

const usePageSnapshotList = (
  workspaceId: string,
  pageDocId: string
): DocHistory[] => {
  const { data } = useQuery(
    {
      query: listHistoryQuery,
      variables: useMemo(
        () => ({
          pageDocId: pageDocId,
          workspaceId: workspaceId,
        }),
        [pageDocId, workspaceId]
      ),
    },
    {
      suspense: true,
    }
  );

  return data.workspace.histories;
};

const snapshotFetcher = async (
  [workspaceId, pageDocId, ts]: [
    workspaceId: string,
    pageDocId: string,
    ts: string,
  ] // timestamp is the key to the history/snapshot
) => {
  if (!ts) {
    return null;
  }
  const time = new Date(ts).getTime();
  const res = await fetchWithTraceReport(
    runtimeConfig.serverUrlPrefix +
      `/api/workspaces/${workspaceId}/docs/${pageDocId}/histories/${time}`,
    {
      priority: 'high',
    }
  );

  if (!res.ok) {
    throw new Error('Failed to fetch snapshot');
  }

  const snapshot = await res.arrayBuffer();
  if (!snapshot) {
    throw new Error('Invalid snapshot');
  }
  return snapshot;
};

// attach the Page shown in the modal to a temporary workspace
// so that we do not need to worry about providers etc
// todo: fix references to the page (the referenced page will shown as deleted)
// if we simply clone the current workspace, it maybe time consuming right?
const workspaceMap = new Map<string, Workspace>();
const getOrCreateWorkspace = (workspaceId: string) => {
  let workspace = workspaceMap.get(workspaceId);
  if (!workspace) {
    const blobStorages: StoreOptions['blobStorages'] = [];
    blobStorages.push(createCloudBlobStorage);
    if (environment.isDesktop && runtimeConfig.enableSQLiteProvider) {
      blobStorages.push(createSQLiteStorage);
    } else {
      blobStorages.push(createIndexeddbStorage);
    }
    blobStorages.push(createStaticStorage);

    workspace = new Workspace({
      id: workspaceId,
      providerCreators: [],
      blobStorages: blobStorages,
      schema: globalBlockSuiteSchema,
    });

    workspaceMap.set(workspaceId, workspace);
  }
  return workspace;
};

// workspace id + page id + timestamp -> snapshot (update binary)
const usePageHistory = (
  workspaceId: string,
  pageDocId: string,
  ts: string | null
) => {
  // snapshot should be immutable. so we use swr immutable to disable revalidation
  const { data } = useSWRImmutable<ArrayBuffer | null>(
    [workspaceId, pageDocId, ts],
    {
      fetcher: snapshotFetcher,
      suspense: true,
    }
  );
  return data;
};

// workspace id + page id + timestamp + snapshot -> Page (to be used for rendering in blocksuite editor)
const useSnapshotPage = (
  workspaceId: string,
  pageDocId: string,
  ts: string,
  snapshot?: ArrayBuffer
) => {
  const page = useMemo(() => {
    const pageId = pageDocId + '-' + ts;
    const historyShellWorkspace = getOrCreateWorkspace(workspaceId);
    let page = historyShellWorkspace.getPage(pageId);
    if (!page && snapshot) {
      page = historyShellWorkspace.createPage(pageId);
      page.awarenessStore.setReadonly(page, true);
      page.load().catch(console.error); // must load before applyUpdate
      applyUpdate(page.spaceDoc, new Uint8Array(snapshot));
    }
    return page;
  }, [pageDocId, snapshot, ts, workspaceId]);

  return page;
};

const HistoryEditor = ({
  workspaceId,
  pageDocId,
  ts,
  snapshot,
}: {
  workspaceId: string;
  pageDocId: string;
  ts: string;
  snapshot: ArrayBuffer;
}) => {
  const page = useSnapshotPage(workspaceId, pageDocId, ts, snapshot);
  const [mode, setMode] = useState<PageMode>('page');

  if (!page) {
    return null;
  }

  return (
    <BlockSuiteEditor
      style={{
        height: '100%',
      }}
      mode={mode}
      page={page}
      onModeChange={setMode}
    />
  );
};

const HistoryList = ({
  workspaceId,
  pageDocId,
  onRestore,
}: {
  workspaceId: string;
  pageDocId: string;
  onRestore: (version: string, update: Uint8Array) => void;
}) => {
  const [activeVersion, setActiveVersion] = useState<string | null>(null);
  const historyList = usePageSnapshotList(workspaceId, pageDocId);
  const snapshot = usePageHistory(workspaceId, pageDocId, activeVersion);

  return (
    <div className={styles.root}>
      <div className={styles.editor}>
        {activeVersion && snapshot ? (
          <HistoryEditor
            workspaceId={workspaceId}
            pageDocId={pageDocId}
            ts={activeVersion}
            snapshot={snapshot}
          />
        ) : null}
      </div>

      <div className={styles.historyList}>
        {historyList.map(history => (
          <div
            className={styles.historyItem}
            key={history.timestamp}
            onClick={e => {
              e.stopPropagation();
              setActiveVersion(history.timestamp);
            }}
            data-active={activeVersion === history.timestamp}
          >
            <button>View version at {history.timestamp}</button>
            {snapshot && activeVersion === history.timestamp ? (
              <button
                className={styles.restoreButton}
                onClick={e => {
                  if (snapshot) {
                    e.stopPropagation();
                    onRestore(history.timestamp, new Uint8Array(snapshot));
                  }
                }}
              >
                Restore
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

export const PageHistoryModal = ({
  onOpenChange,
  open,
  pageId,
  workspace,
}: PageHistoryModalProps) => {
  // page id may be different to doc id
  const pageDocId = useMemo(() => {
    return workspace.getPage(pageId)?.spaceDoc.guid ?? pageId;
  }, [pageId, workspace]);

  const page = useBlockSuiteWorkspacePage(workspace, pageId);

  const { trigger: recover } = useMutation({
    mutation: recoverDocMutation,
  });

  const onRestore = useAsyncCallback(
    async (version: string, update: Uint8Array) => {
      if (!page) {
        return;
      }
      revertUpdate(page.spaceDoc, update, key => {
        console.log(key);
        return 'Map';
      });
      await recover({
        docId: page.spaceDoc.guid,
        timestamp: version,
        workspaceId: workspace.id,
      });

      // onOpenChange(false);
    },
    [page, recover, workspace.id]
  );

  return (
    <ModalContainer onOpenChange={onOpenChange} open={open}>
      <HistoryList
        onRestore={onRestore}
        pageDocId={pageDocId}
        workspaceId={workspace.id}
      />
    </ModalContainer>
  );
};
