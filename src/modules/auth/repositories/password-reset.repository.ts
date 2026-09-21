import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class PasswordResetRepository {
    constructor(private readonly prisma: PrismaService) {}

    countRecentByEmail(email: string, since: Date) {
        return this.prisma.passwordResetToken.count({
            where: { email, createdAt: { gte: since } },
        });
    }

    create(data: {
        email: string;
        userId: string | null;
        usedAt: string | null;
        tokenHash: string;
        expiresAt: Date;
    }) {
        return this.prisma.passwordResetToken.create({ data });
    }

    findValidByHash(tokenHash: string) {
        return this.prisma.passwordResetToken.findFirst({
            where: {
                tokenHash,
                usedAt: null,
                expiresAt: { gt: new Date() },
            },
        });
    }

    markUsed(id: string) {
        return this.prisma.passwordResetToken.update({
            where: { id },
            data: { usedAt: new Date() },
        });
    }
}