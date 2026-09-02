import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    HealthCheck,
    HealthCheckService,
} from '@nestjs/terminus';
import { Public } from '@common/decorators/public.decorator';
import { PrismaHealthIndicator } from './prisma.health';

@ApiTags('Health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly mongo: PrismaHealthIndicator,
    ) { }

    /**
     * Endpoint phục vụ liveness/readiness probe của k8s và các công cụ monitor.
     * Trả 200 khi mọi thành phần OK, 503 khi có thành phần lỗi.
     */
    @Public()
    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
            () => this.mongo.isHealthy('mongodb')
        ]);
    }
}
