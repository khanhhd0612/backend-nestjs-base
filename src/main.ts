import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
    ValidationPipe,
    VersioningType,
} from '@nestjs/common';
import {
    DocumentBuilder,
    SwaggerModule,
} from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { bufferLogs: true, },);

    const configService = app.get(ConfigService);

    const apiPrefix = configService.get<string>('app.apiPrefix',) || 'api';
    const apiVersion = configService.get<string>('app.apiVersion',) || '1';
    const port = configService.get<number>('app.port',) || 3000;
    const corsOrigin = configService.get<string>('app.corsOrigin',) || '*';
    const swaggerEnabled = configService.get<boolean>('app.swaggerEnable',) ?? true;

    //logger
    const logger = app.get(Logger);
    app.useLogger(logger);

    //middleware
    app.use(helmet());
    app.use(compression());
    app.enableCors({
        origin: corsOrigin === '*' ? true : corsOrigin.split(','),
        credentials: true,
    });

    // api prefix && version
    app.setGlobalPrefix(apiPrefix);
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: apiVersion,
    });

    //validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            // Chỉ giữ những field có trong DTO
            whitelist: true,
            // Báo lỗi nếu client gửi field không tồn tại
            forbidNonWhitelisted: true,
            // Tự động transform kiểu dữ liệu
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // sawgger / apidocs
    if (swaggerEnabled) {
        const swaggerConfig = new DocumentBuilder()
            .setTitle(configService.get<string>('app.name',) || 'Backend Service',)
            .setDescription('Tài liệu API tự sinh - NestJS boilerplate',)
            .setVersion(apiVersion)
            .addBearerAuth(
                {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
                'access-token',
            )
            .build();
        const document = SwaggerModule.createDocument(app, swaggerConfig);
        const swaggerPath = `${apiPrefix}/v${apiVersion}/docs`;
        SwaggerModule.setup(swaggerPath, app, document, {
            swaggerOptions: {
                persistAuthorization: true,
            },
        },
        );
        logger.log(`Swagger chạy tại http://localhost:${port}/${swaggerPath}`, 'Swagger',);
    }

    //graceful shutdownGRACEFUL
    app.enableShutdownHooks();

    await app.listen(port);

    logger.log(`Server đang chạy tại http://localhost:${port}/${apiPrefix}/v${apiVersion}`, 'Bootstrap');
}

bootstrap();
