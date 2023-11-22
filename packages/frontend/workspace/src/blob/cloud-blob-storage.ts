import {
  checkBlobSizesQuery,
  deleteBlobMutation,
  fetchWithTraceReport,
  listBlobsQuery,
  setBlobMutation,
} from '@affine/graphql';
import { fetcher } from '@affine/workspace/affine/gql';

import type { BlobStorage } from './engine';
import { predefinedStaticFiles } from './local-static-storage';

export const createCloudBlobStorage = (workspaceId: string): BlobStorage => {
  return {
    get: async key => {
      const suffix = key.startsWith('/')
        ? key
        : predefinedStaticFiles.includes(key)
        ? `/static/${key}`
        : `/api/workspaces/${workspaceId}/blobs/${key}`;

      return fetchWithTraceReport(runtimeConfig.serverUrlPrefix + suffix).then(
        async res => {
          if (!res.ok) {
            // status not in the range 200-299
            return null;
          }
          return await res.arrayBuffer();
        }
      );
    },
    set: async (key, value) => {
      const {
        checkBlobSize: { size },
      } = await fetcher({
        query: checkBlobSizesQuery,
        variables: {
          workspaceId,
          size: value.size,
        },
      });

      if (size <= 0) {
        throw new Error('Blob size limit exceeded');
      }

      const result = await fetcher({
        query: setBlobMutation,
        variables: {
          workspaceId,
          blob: new File([value], key),
        },
      });
      console.assert(result.setBlob === key, 'Blob hash mismatch');
      return key;
    },
    list: async () => {
      const result = await fetcher({
        query: listBlobsQuery,
        variables: {
          workspaceId,
        },
      });
      return result.listBlobs;
    },
    delete: async (key: string) => {
      await fetcher({
        query: deleteBlobMutation,
        variables: {
          workspaceId,
          hash: key,
        },
      });
    },
  };
};
