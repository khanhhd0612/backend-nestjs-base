import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.APP_PORT ?? '3000', 10),
    apiPrefix: process.env.API_PREFIX || 'api',
    apiVersion: process.env.API_VERSION || '1',
    name: process.env.APP_NAME || 'backend-service',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    isProduction: process.env.NODE_ENV === 'production',
    throttle: {
        ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
        limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
    },
    logLevel: process.env.LOG_LEVEL || 'debug',
    swaggerEnable: process.env.SWAGGER_ENABLED !== 'false',
    mailjet: {
        apiKey: process.env.MAILJET_API_KEY,
        secretKey: process.env.MAILJET_SECRET_KEY,
        fromEmail: process.env.MAILJET_FROM_EMAIL,
        fromName: process.env.MAILJET_FROM_NAME,
    },
}));
