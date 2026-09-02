import { HttpException, HttpStatus } from '@nestjs/common';
import {
    ErrorCode,
    ErrorMessage,
} from '@common/constants/error-code.constant';

export interface ErrorDetail {
    field: string;
    message: string;
}

export class BusinessException extends HttpException {
    public readonly errorCode: ErrorCode;
    public readonly details: ErrorDetail[] | null;

    constructor(
        errorCode: ErrorCode,
        status: HttpStatus = HttpStatus.BAD_REQUEST,
        message?: string,
        details?: ErrorDetail[],
    ) {
        super(message || ErrorMessage[errorCode], status);

        this.errorCode = errorCode;
        this.details = details ?? null;
    }
}