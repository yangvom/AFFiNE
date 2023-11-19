import { WorkspaceFlavour } from '@affine/env/workspace';
import { getWorkspacesQuery } from '@affine/graphql';
import { fetcher } from '@affine/workspace/affine/gql';
import { SyncPeer } from '@affine/workspace/providers';
import { type Workspace } from '@blocksuite/store';
import { nanoid } from 'nanoid';
import { getSession } from 'next-auth/react';

import type { WorkspaceMetadata } from '../metadata';
import type { WorkspaceSource } from '.';

export class Affine implements WorkspaceSource {
  async list(): Promise<WorkspaceMetadata[]> {
    if (!environment.isServer && !navigator.onLine) {
      // no network
      return [];
    }
    if (
      !(await getSession()
        .then(() => true)
        .catch(() => false))
    ) {
      return [];
    }

    const { workspaces } = await fetcher({
      query: getWorkspacesQuery,
    });
    const ids = workspaces.map(({ id }) => id);

    return ids.map(
      id =>
        ({
          id,
          flavour: WorkspaceFlavour.AFFINE_CLOUD,
        }) satisfies WorkspaceMetadata
    );
  }
  async create(copyFrom: Workspace): Promise<WorkspaceMetadata> {
    const id = nanoid();

    // save to local storage
    const savePeer = new SyncPeer(copyFrom.doc, createLocalStorage(id));
    await savePeer.waitForSynced();

    // save meta to local storage
    const jsonData = localStorage.getItem(kStoreKey);
    const allWorkspaceIDs = jsonData ? (JSON.parse(jsonData) as string[]) : [];
    allWorkspaceIDs.push(id);
    localStorage.setItem(kStoreKey, JSON.stringify(allWorkspaceIDs));

    return {
      id,
      flavour: WorkspaceFlavour.LOCAL,
    };
  }
  async delete(deleteId: string) {
    const jsonData = localStorage.getItem(kStoreKey);
    const allWorkspaceIDs = jsonData ? (JSON.parse(jsonData) as string[]) : [];
    localStorage.setItem(
      kStoreKey,
      JSON.stringify(allWorkspaceIDs.filter(id => id !== deleteId))
    );
  }
}
