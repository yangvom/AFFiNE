import { DebugLogger } from '@affine/debug';
import { difference } from 'lodash-es';

const logger = new DebugLogger('affine:blob-engine');

export class BlobEngine {
  constructor(
    public local: BlobPeer,
    public remotes: BlobPeer[]
  ) {}

  get peers() {
    return [this.local, ...this.remotes];
  }

  async sync() {
    for (const remote of this.remotes) {
      const localList = await this.local.list();
      const remoteList = await remote.list();

      const needUpload = difference(localList, remoteList);
      const needDownload = difference(remoteList, localList);

      for (const key of needUpload) {
        try {
          const data = await this.local.get(key);
          if (data) {
            await remote.set(key, data);
          }
        } catch (err) {
          logger.error(
            `error when sync ${key} from [${this.local.name}] to [${remote.name}]`,
            err
          );
        }
      }

      for (const key of needDownload) {
        try {
          const data = await remote.get(key);
          if (data) {
            await this.local.set(key, data);
          }
        } catch (err) {
          logger.error(
            `error when sync ${key} from [${remote.name}] to [${this.local.name}]`,
            err
          );
        }
      }
    }
  }

  async get(key: string) {
    for (const peer of this.peers) {
      if (peer.has(key)) {
        const data = await peer.get(key);
        if (data) {
          return data;
        }
      }
    }
    for (const peer of this.peers) {
      const data = await peer.get(key);
      if (data) {
        return data;
      }
    }
    return undefined;
  }

  async set(key: string, value: Uint8Array) {
    // await upload to the local peer
    await this.local.set(key, value);

    // uploads to other peers in the background
    Promise.allSettled(
      this.remotes.slice(1).map(peer =>
        peer.set(key, value).catch(err => {
          logger.error('error when upload to peer', err);
        })
      )
    )
      .then(result => {
        if (result.some(({ status }) => status === 'rejected')) {
          logger.error(
            `blob ${key} update finish, but some peers failed to update`
          );
        } else {
          logger.debug(`blob ${key} update finish`);
        }
      })
      .catch(() => {
        // Promise.allSettled never reject
      });
  }

  async delete(_key: string) {
    // not supported
  }

  async list() {
    const blobList = new Set<string>();

    for (const peer of this.peers) {
      const list = await peer.list();
      if (list) {
        for (const blob of list) {
          blobList.add(blob);
        }
      }
    }

    return Array.from(blobList);
  }
}

export class BlobPeer implements BlobStorage {
  cachedBlobList: Set<string> = new Set();

  get name() {
    return this.storage.name;
  }

  constructor(public storage: BlobStorage) {}

  async get(key: string) {
    const data = await this.storage.get(key);

    if (data) {
      this.cachedBlobList.add(key);
    }

    return data;
  }

  has(key: string): boolean {
    return this.cachedBlobList.has(key);
  }

  async set(key: string, value: Uint8Array) {
    await this.storage.set(key, value);

    this.cachedBlobList.add(key);
  }

  async list() {
    const blobList = await this.storage.list();

    if (blobList) {
      for (const blob of blobList) {
        this.cachedBlobList.add(blob);
      }
    }

    return blobList;
  }

  async delete(_key: string) {
    // not supported
  }
}

export interface BlobStorage {
  name: string;
  get: (key: string) => Promise<Uint8Array | undefined>;
  set: (key: string, value: Uint8Array) => Promise<void>;
  delete: (key: string) => Promise<void>;
  list: () => Promise<string[]>;
}
