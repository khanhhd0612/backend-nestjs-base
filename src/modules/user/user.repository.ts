import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class UserRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findFirst({ where: { email, deletedAt: null } });
    }

    async findById(id: string): Promise<User | null> {
        return this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    }
}
