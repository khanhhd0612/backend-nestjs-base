import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const CORRELATION_ID_HEADER = 'x-request-id';

/**
 * Gắn requestId (correlation-id) cho mỗi request để phục vụ tracing xuyên suốt
 * log -> exception filter -> response header, giúp truy vết log khi debug production.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void {
        const incomingId = req.headers[CORRELATION_ID_HEADER] as string | undefined;
        const requestId = incomingId || uuidv4();

        (req as any).id = requestId;
        res.setHeader(CORRELATION_ID_HEADER, requestId);
        next();
    }
}
