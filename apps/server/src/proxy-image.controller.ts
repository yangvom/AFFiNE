import { Controller, Get, Next, Query, Req, Res } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import request from 'request';

@Controller('/api/proxy/image')
export class ProxyImageController {
  @Get()
  async proxyImage(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: Record<string, any>,
    @Next() next: NextFunction
  ) {
    switch (req.query.responseType) {
      case 'blob':
        req.pipe(request(query.url).on('error', next)).pipe(res);
        break;
      case 'text':
      default:
        request(query.url, { encoding: 'binary' }, (error, response, body) => {
          if (error) {
            return next(error);
          }
          res.send(
            `data:${response.headers['content-type']};base64,${Buffer.from(
              body,
              'binary'
            ).toString('base64')}`
          );
        });
    }
  }
}
