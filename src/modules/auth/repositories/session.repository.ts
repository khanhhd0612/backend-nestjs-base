import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';


@Injectable()
export class SessionRepository {
    constructor(private readonly prisma: PrismaService) { }

    create(data: {
        userId: string;
        jti: string;
        userAgent?: string;
        ip?: string;
        deviceName: string;
        expiresAt: Date;
    }) {
        return this.prisma.userSession.create({
            data: { ...data, revokedAt: null }
        });
    }

    findActiveByUser(userId: string) {
        return this.prisma.userSession.findMany({
            where: {
                userId,
                revokedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: { lastUsedAt: 'desc' },
        });
    }

    findById(id: string) {
        return this.prisma.userSession.findUnique({ where: { id } });
    }

    async revoke(id: string) {
        return this.prisma.userSession.update({
            where: { id },
            data: { revokedAt: new Date() },
        });
    }

    async revokeByJti(jti: string) {
        return this.prisma.userSession.updateMany({
            where: { jti },
            data: { revokedAt: new Date() },
        });
    }

    async revokeAllExcept(userId: string, exceptJti: string) {
        return this.prisma.userSession.updateMany({
            where: { userId, jti: { not: exceptJti }, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
}