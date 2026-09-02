import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService bọc PrismaClient thành một Nest provider có vòng đời (lifecycle):
 * - onModuleInit: mở kết nối tới MongoDB khi ứng dụng khởi động
 * - onModuleDestroy: đóng kết nối sạch sẽ khi ứng dụng tắt (tránh leak connection)
 *
 * Với MongoDB, "connect" thực chất là thiết lập kết nối tới replica set/cluster
 * theo DATABASE_URL (mongodb:// hoặc mongodb+srv://).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor(private readonly configService: ConfigService) {
        super({
            datasources: {
                db: {
                    url: configService.get<string>('database.url'),
                },
            },
            log: configService.get<string>('app.env') === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
        });
    }

    async onModuleInit(): Promise<void> {
        try {
            await this.$connect();
            this.logger.log('Kết nối MongoDB (Prisma) thành công');
        } catch (error) {
            this.logger.error('Kết nối MongoDB (Prisma) thất bại', error as Error);
            throw error;
        }
    }

    async onModuleDestroy(): Promise<void> {
        await this.$disconnect();
        this.logger.log('Đã đóng kết nối MongoDB (Prisma)');
    }

    /**
     * Dùng trong health check / test để xoá sạch dữ liệu các collection cần thiết.
     * KHÔNG dùng ở production.
     */
    async cleanDatabase(): Promise<void> {
        if (this.configService.get<string>('app.env') === 'production') {
            throw new Error('cleanDatabase() không được phép chạy ở môi trường production');
        }
        await this.user.deleteMany({});
    }
}
