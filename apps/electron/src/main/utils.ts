import http, {
  type IncomingHttpHeaders,
  type OutgoingHttpHeaders,
  type RequestOptions,
} from 'node:http';
import https from 'node:https';

import type { CookiesSetDetails } from 'electron';

export function parseCookie(
  cookieString: string,
  url: string
): CookiesSetDetails {
  const [nameValuePair, ...attributes] = cookieString
    .split('; ')
    .map(part => part.trim());

  const [name, value] = nameValuePair.split('=');

  const details: CookiesSetDetails = { url, name, value };

  attributes.forEach(attribute => {
    const [key, val] = attribute.split('=');

    switch (key.toLowerCase()) {
      case 'domain':
        details.domain = val;
        break;
      case 'path':
        details.path = val;
        break;
      case 'secure':
        details.secure = true;
        break;
      case 'httponly':
        details.httpOnly = true;
        break;
      case 'expires':
        details.expirationDate = new Date(val).getTime() / 1000; // Convert to seconds
        break;
      case 'samesite':
        if (
          ['unspecified', 'no_restriction', 'lax', 'strict'].includes(
            val.toLowerCase()
          )
        ) {
          details.sameSite = val.toLowerCase() as
            | 'unspecified'
            | 'no_restriction'
            | 'lax'
            | 'strict';
        }
        break;
      default:
        // Handle other cookie attributes if needed
        break;
    }
  });

  return details;
}

/**
 * Send a GET request to a specified URL.
 * This function uses native http/https modules instead of fetch to
 * bypassing set-cookies headers
 */
export async function simpleGet(
  requestUrl: string,
  headers?: Headers
): Promise<{
  body: string;
  headers: [string, string][];
  statusCode: number;
}> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(requestUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    const options: RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: headers ? headersToOutgoingHeaders(headers) : {},
    };
    const req = protocol.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          body: data,
          headers: incomingHeadersToArray(res.headers),
          statusCode: res.statusCode || 200,
        });
      });
    });
    req.on('error', error => {
      reject(error);
    });
    req.end();
  });
}

function incomingHeadersToArray(headers: IncomingHttpHeaders) {
  const result: [string, string][] = [];
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      value.forEach(v => {
        result.push([key, v]);
      });
    } else {
      result.push([key, value || '']);
    }
  }
  return result;
}

function headersToOutgoingHeaders(headers: Headers): OutgoingHttpHeaders {
  const result: OutgoingHttpHeaders = {};
  headers.forEach((value, key) => {
    const existing = result[key];
    result[key] = Array.isArray(existing) ? [...existing, value] : value;
  });
  return result;
}
