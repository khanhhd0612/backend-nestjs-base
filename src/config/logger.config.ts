import { Params } from 'nestjs-pino';

export const pinoConfig = (
    env: string,
    logLevel: string,
): Params => ({
    pinoHttp: {
        level: logLevel,

        autoLogging: false,

        customProps: (req) => ({
            requestId: req.id,
        }),

        transport: env === 'production' ? undefined : {
            target: 'pino-pretty',
            options: {
                colorize: true,
                singleLine: true,
                translateTime: 'SYS:standard',
            },
        },
    },
});