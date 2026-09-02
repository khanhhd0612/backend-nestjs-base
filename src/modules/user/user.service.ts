import { HttpStatus, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@database/prisma/prisma.service';
import { BaseService } from '@common/base/base.service';
import { ErrorCode, ErrorMessage } from '@common/constants/error-code.constant';
import { BusinessException } from '@common/exceptions/business.exception';
import { UserRepository } from './user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService extends BaseService<User> {
    constructor(
        private readonly prisma: PrismaService,
        private readonly userRepository: UserRepository,
    ) {
        super(prisma.user, ErrorCode.USER_NOT_FOUND);
    }

    async createUser(dto: CreateUserDto): Promise<User> {
        const existing = await this.userRepository.findByEmail(dto.email);

        if (existing) {
            throw new BusinessException(
                ErrorCode.USER_EMAIL_ALREADY_EXISTS,
                HttpStatus.CONFLICT,
                ErrorMessage[ErrorCode.USER_EMAIL_ALREADY_EXISTS],
            );
        }

        const passwordHash = await bcrypt.hash(dto.password, 10);

        return this.create({
            ...dto,
            password: passwordHash,
        });
    }

    async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
        return this.update(id, dto);
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.userRepository.findByEmail(email);
    }

    async findById(id: string): Promise<User | null> {
        return this.userRepository.findById(id)
    }

    async changePassword(id: string, newPassword: string): Promise<User> {
        return this.update(id, {
            password: newPassword,
            tokenValidAfter: new Date(),
        });
    }
}
