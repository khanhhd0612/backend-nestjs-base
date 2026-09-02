import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class LoggingInterceptor
    implements NestInterceptor {

    constructor(
        private readonly logger: PinoLogger,
    ) { }

    intercept(context: ExecutionContext, next: CallHandler,): Observable<any> {
        const httpContext = context.switchToHttp();
        const request = httpContext.getRequest();
        const response = httpContext.getResponse();
        const { method, url, } = request;
        const requestId = request.id;
        const start = Date.now();

        return next.handle().pipe(tap(() => {
            const duration = Date.now() - start;
            const statusCode = response.statusCode;
            /**
             * Structured logging
             */
            this.logger.info(
                {
                    requestId,
                    method,
                    url,
                    statusCode,
                    duration,
                },
                'Request completed',
            );
        }),
        );
    }
}
