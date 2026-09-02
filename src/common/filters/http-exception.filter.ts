import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import {
    Request,
    Response,
} from 'express';
import { PinoLogger } from 'nestjs-pino';

import {
    ErrorCode,
    ErrorMessage,
} from '@common/constants/error-code.constant';

import {
    BusinessException,
    ErrorDetail,
} from '@common/exceptions/business.exception';

interface ErrorResponseBody {
    success: false;
    statusCode: number;
    errorCode: string;
    message: string | string[];
    details?: ErrorDetail[] | null;
    timestamp: string;
    path: string;
    requestId?: string;
}

@Catch()
export class AllExceptionsFilter
    implements ExceptionFilter {

    constructor(
        private readonly logger: PinoLogger,
    ) { }

    catch(exception: unknown, host: ArgumentsHost,): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const requestId = (request as any).id;
        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let errorCode: string = ErrorCode.INTERNAL_SERVER_ERROR;
        let message: string | string[] = ErrorMessage[ErrorCode.INTERNAL_SERVER_ERROR];
        let details: ErrorDetail[] | null = null;

        //BusinessException
        if (exception instanceof BusinessException) {
            status = exception.getStatus();
            errorCode = exception.errorCode;
            message = exception.message;
            details = exception.details ?? null;
        }

        /**

         * HttpException

         *
         * Bao gồm:
         * - BadRequestException
         * - UnauthorizedException
         * - ForbiddenException
         * - NotFoundException
         * - ValidationPipe
         */

        else if (exception instanceof HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse();
            if (typeof res === 'string') {
                message = res;
            }

            else if (typeof res === 'object' && res !== null) {
                const errorResponse = res as Record<string, any>;

                message = errorResponse.message ?? exception.message;

                /**
                 * Exception có details
                 */
                if (Array.isArray(errorResponse.details,)) {
                    details = errorResponse.details;
                }

                /**
                 * ValidationPipe
                 *
                 * message:
                 *
                 * [
                 *   "total must be greater than 0",
                 *   "customerId should not be empty"
                 * ]
                 */
                if (Array.isArray(message)) {
                    details = message.map((item: string,) => ({
                        field: this.extractField(item,),
                        message: this.extractValidationMessage(item,),
                    }),
                    );
                }
            }

            errorCode =
                this.mapStatusToErrorCode(
                    status,
                );
        }

        /**

         * Unknown Error

         *
         * Không trả stack trace
         * cho FE.
         *
         * Stack trace chỉ nằm
         * trong production log.
         */

        else if (
            exception instanceof Error
        ) {
            this.logger.error(
                {
                    requestId,
                    method: request.method,
                    url: request.originalUrl || request.url,
                    statusCode: status, errorCode,
                    err: exception,
                },
                'Unhandled exception',
            );
        }

        //Response chuẩn
        const body:
            ErrorResponseBody = {
            success: false,
            statusCode: status,
            errorCode,
            message,
            details,
            timestamp: new Date().toISOString(),
            path: request.originalUrl || request.url,
            requestId,
        };

        //Structured error log
        this.logger.warn({
            requestId,
            method: request.method,
            url: request.originalUrl || request.url,
            statusCode: status,
            errorCode,
        },
            'HTTP request failed',
        );
        //Response
        response.status(status).json(body);
    }

    /**
     * HTTP Status -> ErrorCode
     */

    private mapStatusToErrorCode(
        status: number,
    ): ErrorCode {
        switch (status) {
            case HttpStatus.BAD_REQUEST:
                return ErrorCode.VALIDATION_ERROR;

            case HttpStatus.UNAUTHORIZED:
                return ErrorCode.UNAUTHORIZED;

            case HttpStatus.FORBIDDEN:
                return ErrorCode.FORBIDDEN;

            case HttpStatus.NOT_FOUND:
                return ErrorCode.NOT_FOUND;

            case HttpStatus.TOO_MANY_REQUESTS:
                return ErrorCode.TOO_MANY_REQUESTS;

            case HttpStatus.SERVICE_UNAVAILABLE:
                return ErrorCode.SERVICE_UNAVAILABLE;

            default:
                return ErrorCode.INTERNAL_SERVER_ERROR;
        }
    }

    /**
     * Extract field
     *
     * "total must be greater than 0"
     *
     * -> "total"
     */

    private extractField(
        message: string,
    ): string {
        return message.split(' ')[0];
    }

    /**
     * Extract validation message
     *
     * "total must be greater than 0"
     *
     * -> "must be greater than 0"
     */

    private extractValidationMessage(
        message: string,
    ): string {
        const parts = message.split(' ');
        parts.shift();
        return parts.join(' ');
    }
}
