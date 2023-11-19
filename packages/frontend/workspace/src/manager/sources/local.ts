import { WorkspaceFlavour } from '@affine/env/workspace';
import { SyncPeer } from '@affine/workspace/providers';
import { createLocalStorage } from '@affine/workspace/providers/storage';
import type { Workspace } from '@blocksuite/store';
import { nanoid } from 'nanoid';

import type { WorkspaceMetadata } from '../metadata';
import type { WorkspaceSource } from '.';

const kStoreKey = 'affine-local-workspace';

export class Local implements WorkspaceSource {
  async list(): Promise<WorkspaceMetadata[]> {
    const jsonData = localStorage.getItem(kStoreKey);
    const allWorkspaceIDs = jsonData ? (JSON.parse(jsonData) as string[]) : [];
    return allWorkspaceIDs.map(id => ({
      id,
      flavour: WorkspaceFlavour.LOCAL,
    }));
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
