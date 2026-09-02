import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
    success: boolean;
    statusCode: number;
    data: T;
    meta?: Record<string, any> | null;
    timestamp: string;
    path: string;
    requestId?: string;
}

@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T, Response<T>> {

    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<Response<T>> {

        const httpContext = context.switchToHttp();
        const request = httpContext.getRequest();
        const response = httpContext.getResponse();

        return next.handle().pipe(
            map((result) => {
                const statusCode = response.statusCode;

                // Controller chủ động trả data + meta
                if (
                    result &&
                    typeof result === 'object' &&
                    ('data' in result || 'meta' in result)
                ) {
                    return {
                        success: true,
                        statusCode,
                        data: result.data ?? null,
                        meta: result.meta ?? null,
                        timestamp: new Date().toISOString(),
                        path: request.originalUrl || request.url,
                        requestId: request.id,
                    };
                }

                // Controller chỉ trả data bình thường
                return {
                    success: true,
                    statusCode,
                    data: result ?? null,
                    meta: null,
                    timestamp: new Date().toISOString(),
                    path: request.originalUrl || request.url,
                    requestId: request.id,
                };
            }),
        );
    }
}