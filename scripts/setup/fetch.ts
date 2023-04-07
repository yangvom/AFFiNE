import { fetch, Request, Response } from 'undici';

// @ts-expect-error
globalThis.fetch = fetch;
// @ts-expect-error
globalThis.Request = Request;
// @ts-expect-error
globalThis.Response = Response;
