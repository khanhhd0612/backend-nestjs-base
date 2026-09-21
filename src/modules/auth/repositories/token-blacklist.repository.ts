import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class TokenBlacklistRepository {
    constructor(private readonly prisma: PrismaService) { }

    async exists(jti: string): Promise<boolean> {
        const record = await this.prisma.blacklistedToken.findUnique({
            where: { jti },
            select: { id: true }, // chỉ lấy field cần thiết
        });
        return !!record;
    }

    async create(data: { jti: string; userId: string; expiresAt: Date }): Promise<void> {
        await this.prisma.blacklistedToken.create({ data });
    }
}