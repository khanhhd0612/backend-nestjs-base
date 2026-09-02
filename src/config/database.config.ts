import { registerAs } from '@nestjs/config';

/**
 * Cấu hình kết nối MongoDB thông qua Prisma.
 */
export default registerAs('database', () => ({
    url: process.env.DATABASE_URL,
}));
