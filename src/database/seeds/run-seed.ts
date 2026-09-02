import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });

const prisma = new PrismaClient();

/**
 * Seed dữ liệu khởi tạo: tài khoản admin mặc định.
 * Chạy: npm run seed
 */
async function runSeed() {
    const existing = await prisma.user.findFirst({ where: { email: 'admin@example.com' } });

    if (!existing) {
        const passwordHash = await bcrypt.hash('Admin@123', 10);
        await prisma.user.create({
            data: {
                email: 'admin@example.com',
                password: passwordHash,
                fullName: 'Administrator',
                role: 'admin',
                deletedAt: null,
            },
        });
        console.log('Seed thành công: đã tạo tài khoản admin@example.com / Admin@123');
    } else {
        console.log('Tài khoản admin đã tồn tại, bỏ qua seed');
    }
}

runSeed()
    .catch((err) => {
        console.error('Seed thất bại:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
