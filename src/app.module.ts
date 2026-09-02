import {
    MiddlewareConsumer,
    Module,
    NestModule,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import {
    APP_FILTER,
    APP_GUARD,
    APP_INTERCEPTOR,
} from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

import appConfig from '@config/app.config';
import databaseConfig from '@config/database.config';
import jwtConfig from '@config/jwt.config';
import { envValidationSchema } from '@config/env.validation';
import { pinoConfig } from '@config/logger.config';

import { PrismaModule } from '@database/prisma/prisma.module';
import { CorrelationIdMiddleware } from '@common/middleware/orrelation-id.middleware';
import { TransformInterceptor } from '@/common/interceptors/transform.interceptor';
import { LoggingInterceptor } from '@/common/interceptors/logging.interceptor';
import { AllExceptionsFilter } from '@/common/filters/http-exception.filter';

import { HealthModule } from './modules/health/health.module';
import { MetaModule } from './modules/meta/meta.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: `.env.${process.env.NODE_ENV || 'dev'}`,
            validationSchema: envValidationSchema,
            validationOptions: {
                abortEarly: false,
            },
            load: [appConfig, databaseConfig, jwtConfig,
            ],
        }),

        LoggerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const nodeEnv = configService.get<string>('app.env') || 'development';
                const logLevel = configService.get<string>('app.logLevel') || 'debug';

                return pinoConfig(nodeEnv, logLevel);
            },
        }),

        ThrottlerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                throttlers: [
                    {
                        ttl: (configService.get<number>('app.throttle.ttl',) || 60) * 1000,
                        limit: configService.get<number>('app.throttle.limit',) || 100,
                    },
                ],
            }),
        }),

        PrismaModule,
        HealthModule,
        MetaModule,
    ],

    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },

        {
            provide: APP_FILTER,
            useClass: AllExceptionsFilter,
        },

        {
            provide: APP_INTERCEPTOR,
            useClass: LoggingInterceptor,
        },

        {
            provide: APP_INTERCEPTOR,
            useClass: TransformInterceptor,
        },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer
            .apply(CorrelationIdMiddleware)
            .forRoutes('*');
    }
}