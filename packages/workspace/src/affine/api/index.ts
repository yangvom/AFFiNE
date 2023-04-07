import { MessageCode, Messages } from '@affine/env';
import { assertExists } from '@blocksuite/global/utils';
import ky from 'ky';
import { z } from 'zod';

import { createAffineAuth, getLoginStorage, setLoginStorage } from '../login';
export class RequestError extends Error {
  public readonly code: MessageCode;

  constructor(code: MessageCode, cause: unknown | null = null) {
    super(Messages[code].message);
    sendMessage(code);
    this.code = code;
    this.name = 'RequestError';
    this.cause = cause;
  }
}

function sendMessage(code: MessageCode) {
  document.dispatchEvent(
    new CustomEvent('affine-error', {
      detail: {
        code,
      },
    })
  );
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  create_at: string;
}

export interface GetUserByEmailParams {
  email: string;
  workspace_id: string;
}

export const usageResponseSchema = z.object({
  blob_usage: z.object({
    usage: z.number(),
    max_usage: z.number(),
  }),
});

export type UsageResponse = z.infer<typeof usageResponseSchema>;

export function createUserApis(prefixUrl = '/') {
  return {
    getUsage: async (): Promise<UsageResponse> => {
      const auth = getLoginStorage();
      assertExists(auth);
      return fetch(prefixUrl + 'api/resource/usage', {
        method: 'GET',
        headers: {
          Authorization: auth.token,
        },
      }).then(r => r.json());
    },
    getUserByEmail: async (
      params: GetUserByEmailParams
    ): Promise<User[] | null> => {
      const auth = getLoginStorage();
      assertExists(auth);
      const target = new URL(prefixUrl + 'api/user', window.location.origin);
      target.searchParams.append('email', params.email);
      target.searchParams.append('workspace_id', params.workspace_id);
      return fetch(target, {
        method: 'GET',
        headers: {
          Authorization: auth.token,
        },
      }).then(r => r.json());
    },
  } as const;
}

export interface GetWorkspaceDetailParams {
  id: string;
}

export enum WorkspaceType {
  Private = 0,
  Normal = 1,
}

export enum PermissionType {
  Read = 0,
  Write = 1,
  Admin = 10,
  Owner = 99,
}

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  avatar_url: z.string(),
  created_at: z.number(),
});

export const workspaceSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(WorkspaceType),
  public: z.boolean(),
  permission: z.nativeEnum(PermissionType),
});

export type Workspace = z.infer<typeof workspaceSchema>;

export const workspaceDetailSchema = z.object({
  ...workspaceSchema.shape,
  permission: z.undefined(),
  owner: userSchema,
  member_count: z.number(),
});

export type WorkspaceDetail = z.infer<typeof workspaceDetailSchema>;

export interface Permission {
  id: string;
  type: PermissionType;
  workspace_id: string;
  user_id: string;
  user_email: string;
  accepted: boolean;
  create_at: number;
}

export interface RegisteredUser extends User {
  type: 'Registered';
}

export interface UnregisteredUser {
  type: 'Unregistered';
  email: string;
}

export interface Member extends Permission {
  user: RegisteredUser | UnregisteredUser;
}

export interface GetWorkspaceMembersParams {
  id: string;
}

export interface CreateWorkspaceParams {
  name: string;
}

export interface UpdateWorkspaceParams {
  id: string;
  public: boolean;
}

export interface DeleteWorkspaceParams {
  id: string;
}

export interface InviteMemberParams {
  id: string;
  email: string;
}

export interface RemoveMemberParams {
  permissionId: number;
}

export interface AcceptInvitingParams {
  invitingCode: string;
}

export interface LeaveWorkspaceParams {
  id: number | string;
}

export const createWorkspaceResponseSchema = z.object({
  id: z.string(),
  public: z.boolean(),
  type: z.nativeEnum(WorkspaceType),
  created_at: z.number(),
});

export function createWorkspaceApis(
  prefixUrl = '/',
  affineAuth: ReturnType<typeof createAffineAuth> = createAffineAuth()
) {
  const $ = ky.extend({
    prefixUrl,
    retry: 2,
    hooks: {
      beforeError: [
        error => {
          console.log(error);
          return error;
        },
      ],
      beforeRequest: [
        request => {
          if (request.url.includes('public')) {
            // ignore public request
            return;
          }
          const storage = getLoginStorage();
          if (storage) {
            request.headers.set('Authorization', storage.token);
          }
        },
      ],
      afterResponse: [
        async (request, _, response) => {
          if (response.status === 401) {
            if (request.url.endsWith('api/user/token')) {
              // ignore itself request
              return;
            }
            const storage = getLoginStorage();
            if (storage) {
              // refresh token
              const response = await affineAuth.refreshToken(storage);
              if (response) {
                setLoginStorage(response);
              }
            }
          }
        },
      ],
    },
  });
  return {
    getWorkspaces: async (): Promise<Workspace[]> => {
      return $.get('api/workspace', {
        headers: {
          'Cache-Control': 'no-cache',
        },
        hooks: {
          beforeError: [
            error => {
              sendMessage(MessageCode.loadListFailed);
              error.message = Messages[MessageCode.loadListFailed].message;
              return error;
            },
          ],
        },
      }).json();
    },
    getWorkspaceDetail: async (
      params: GetWorkspaceDetailParams
    ): Promise<WorkspaceDetail | null> => {
      return $.get(`api/workspace/${params.id}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        hooks: {
          beforeError: [
            error => {
              sendMessage(MessageCode.loadListFailed);
              error.message = Messages[MessageCode.loadListFailed].message;
              return error;
            },
          ],
        },
      }).json();
    },
    getWorkspaceMembers: async (
      params: GetWorkspaceDetailParams
    ): Promise<Member[]> => {
      return $.get(`api/workspace/${params.id}/permission`, {
        headers: {
          'Content-Type': 'application/json',
        },
        hooks: {
          beforeError: [
            error => {
              sendMessage(MessageCode.getMembersFailed);
              error.message = Messages[MessageCode.getMembersFailed].message;
              return error;
            },
          ],
        },
      }).json();
    },
    createWorkspace: async (
      encodedYDoc: ArrayBuffer
    ): Promise<{ id: string }> => {
      return $.post('api/workspace', {
        body: encodedYDoc,
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        hooks: {
          beforeError: [
            error => {
              sendMessage(MessageCode.createWorkspaceFailed);
              error.message =
                Messages[MessageCode.createWorkspaceFailed].message;
              return error;
            },
          ],
        },
      }).json();
    },
    updateWorkspace: async (
      params: UpdateWorkspaceParams
    ): Promise<{ public: boolean | null }> => {
      return $.post(`api/workspace/${params.id}`, {
        json: {
          public: params.public,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        hooks: {
          beforeError: [
            error => {
              sendMessage(MessageCode.updateWorkspaceFailed);
              error.message =
                Messages[MessageCode.updateWorkspaceFailed].message;
              return error;
            },
          ],
        },
      }).json();
    },
    deleteWorkspace: async (
      params: DeleteWorkspaceParams
    ): Promise<boolean> => {
      return $.delete(`api/workspace/${params.id}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        hooks: {
          beforeError: [
            error => {
              sendMessage(MessageCode.deleteWorkspaceFailed);
              error.message =
                Messages[MessageCode.deleteWorkspaceFailed].message;
              return error;
            },
          ],
        },
      }).then(response => response.ok);
    },

    /**
     * Notice: Only support normal(contrast to private) workspace.
     */
    inviteMember: async (params: InviteMemberParams): Promise<void> => {
      return $.post(`api/workspace/${params.id}/permission`, {
        json: {
          email: params.email,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        hooks: {
          beforeError: [
            error => {
              sendMessage(MessageCode.inviteMemberFailed);
              error.message = Messages[MessageCode.inviteMemberFailed].message;
              return error;
            },
          ],
        },
      }).json();
    },
    removeMember: async (params: RemoveMemberParams): Promise<void> => {
      return $.delete(`api/permission/${params.permissionId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        hooks: {
          beforeError: [
            error => {
              sendMessage(MessageCode.removeMemberFailed);
              error.message = Messages[MessageCode.removeMemberFailed].message;
              return error;
            },
          ],
        },
      }).json();
    },
    acceptInviting: async (
      params: AcceptInvitingParams
    ): Promise<Permission> => {
      return $.post(`api/invitation/${params.invitingCode}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        hooks: {
          beforeError: [
            error => {
              sendMessage(MessageCode.acceptInvitingFailed);
              error.message =
                Messages[MessageCode.acceptInvitingFailed].message;
              return error;
            },
          ],
        },
      }).json();
    },
    uploadBlob: async (
      workspaceId: string,
      arrayBuffer: ArrayBuffer,
      type: string
    ): Promise<string> => {
      return $.post(`api/workspace/${workspaceId}/blob`, {
        body: arrayBuffer,
        headers: {
          'Content-Type': type,
        },
        hooks: {
          beforeError: [
            error => {
              // error.message = Messages[MessageCode.uploadBlobFailed].message
              return error;
            },
          ],
        },
      }).text();
    },
    getBlob: async (
      workspaceId: string,
      blobId: string
    ): Promise<ArrayBuffer> => {
      return $.get(`api/workspace/${workspaceId}/blob/${blobId}`, {
        hooks: {
          beforeError: [
            error => {
              sendMessage(MessageCode.getBlobFailed);
              error.message = Messages[MessageCode.getBlobFailed].message;
              return error;
            },
          ],
        },
      }).arrayBuffer();
    },
    leaveWorkspace: async ({ id }: LeaveWorkspaceParams) => {
      return $.delete(`api/workspace/${id}/permission`, {
        headers: {
          'Content-Type': 'application/json',
        },
        hooks: {
          beforeError: [
            error => {
              sendMessage(MessageCode.leaveWorkspaceFailed);
              error.message =
                Messages[MessageCode.leaveWorkspaceFailed].message;
              return error;
            },
          ],
        },
      }).json();
    },
    downloadPublicWorkspacePage: async (
      workspaceId: string,
      pageId: string
    ): Promise<ArrayBuffer> => {
      return $.get(`api/public/workspace/${workspaceId}/${pageId}`, {
        hooks: {
          beforeError: [
            error => {
              // error.message = Messages[
              //   MessageCode.downloadPublicWorkspacePageFailed
              // ].message
              return error;
            },
          ],
        },
      }).arrayBuffer();
    },
    downloadWorkspace: async (
      workspaceId: string,
      published = false
    ): Promise<ArrayBuffer> => {
      if (published) {
        return $.get(`api/public/workspace/${workspaceId}`).arrayBuffer();
      } else {
        return $.get(`api/workspace/${workspaceId}/doc`, {
          hooks: {
            beforeError: [
              error => {
                sendMessage(MessageCode.downloadWorkspaceFailed);
                error.message =
                  Messages[MessageCode.downloadWorkspaceFailed].message;
                return error;
              },
            ],
          },
        }).arrayBuffer();
      }
    },
  } as const;
}
