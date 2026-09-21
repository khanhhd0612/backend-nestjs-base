import * as Joi from 'joi';

/**
 * Schema kiểm tra toàn bộ biến môi trường khi ứng dụng khởi động.
 * Nếu thiếu hoặc sai định dạng biến bắt buộc -> ứng dụng sẽ dừng khởi động ngay lập tức,
 */
export const envValidationSchema = Joi.object({
    // App
    NODE_ENV: Joi.string()
        .valid('development', 'staging', 'production', 'test')
        .default('development'),
    APP_PORT: Joi.number().default(3000),
    APP_NAME: Joi.string().default('backend-service'),
    CORS_ORIGIN: Joi.string().default('*'),

    // Database
    DATABASE_URL: Joi.string()
        .pattern(/^mongodb(\+srv)?:\/\//)
        .required()
        .messages({
            'string.pattern.base':
                'DATABASE_URL phải bắt đầu bằng mongodb:// hoặc mongodb+srv://',
        }),

    // prefix & version
    API_PREFIX: Joi.string().default('api'),
    API_VERSION: Joi.string().default('1'),

    // JWT
    JWT_ACCESS_SECRET: Joi.string().min(32).required(),
    JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
    JWT_REFRESH_SECRET: Joi.string().min(32).required(),
    JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

    // Throttler
    THROTTLE_TTL: Joi.number().default(60),
    THROTTLE_LIMIT: Joi.number().default(100),

    // Logging
    LOG_LEVEL: Joi.string()
        .valid('error', 'warn', 'info', 'http', 'debug')
        .default('debug'),
    // docs
    SWAGGER_ENABLED: Joi.boolean().default(true),

    // Mailjet
    MAILJET_API_KEY: Joi.string().required(),
    MAILJET_SECRET_KEY: Joi.string().required(),
    MAILJET_FROM_EMAIL: Joi.string().email().required(),
    MAILJET_FROM_NAME: Joi.string().required(),

    // Frontend
    FRONTEND_URL: Joi.string().uri().required(),
});