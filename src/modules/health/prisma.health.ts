import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '@database/prisma/prisma.service';

/**
 * Custom Terminus health indicator cho MongoDB thông qua Prisma.
 * Terminus không có sẵn indicator cho Prisma/MongoDB nên tự viết bằng cách
 * ping thử một lệnh nhẹ (đếm số bản ghi) tới database.
 */
@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        try {
            await this.prisma.$runCommandRaw({ ping: 1 });
            return this.getStatus(key, true);
        } catch (error) {
            throw new HealthCheckError(
                'MongoDB check failed',
                this.getStatus(key, false, { message: (error as Error).message }),
            );
        }
    }
}
