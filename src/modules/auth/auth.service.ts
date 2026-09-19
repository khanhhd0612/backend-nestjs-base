import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ErrorCode, ErrorMessage } from '@common/constants/error-code.constant';
import { BusinessException } from '@common/exceptions/business.exception';
import { UserService } from '@modules/user/user.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { TokenBlacklistRepository } from './token-blacklist.repository'

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly tokenBlacklistRepository: TokenBlacklistRepository,
    ) { }

    async login(dto: LoginDto): Promise<AuthResponseDto> {
        const user = await this.userService.findByEmail(dto.email);
        if (!user) {
            throw new BusinessException(
                ErrorCode.AUTH_INVALID_CREDENTIALS,
                HttpStatus.UNAUTHORIZED,
                ErrorMessage[ErrorCode.AUTH_INVALID_CREDENTIALS],
            );
        }

        const isMatch = await bcrypt.compare(dto.password, user.password);

        if (!isMatch) {
            throw new BusinessException(
                ErrorCode.AUTH_INVALID_CREDENTIALS,
                HttpStatus.UNAUTHORIZED,
                ErrorMessage[ErrorCode.AUTH_INVALID_CREDENTIALS],
            );
        }

        if (!user.isActive) {
            throw new BusinessException(
                ErrorCode.AUTH_ACCOUNT_LOCKED,
                HttpStatus.FORBIDDEN,
                ErrorMessage[ErrorCode.AUTH_ACCOUNT_LOCKED],
            );
        }

        return this.generateTokens({ sub: user.id, email: user.email, role: user.role });
    }

    async register(dto: RegisterDto) {
        const existing = await this.userService.findByEmail(dto.email);

        if (existing) {
            throw new BusinessException(
                ErrorCode.USER_EMAIL_ALREADY_EXISTS,
                HttpStatus.CONFLICT,
                ErrorMessage[ErrorCode.USER_EMAIL_ALREADY_EXISTS],
            );
        }

        const passwordHash = await bcrypt.hash(dto.password, 10);

        try {
            return await this.userService.create({
                ...dto,
                password: passwordHash,
                deletedAt: null,
            });
        } catch (err) {
            if (
                err instanceof Prisma.PrismaClientKnownRequestError &&
                err.code === 'P2002'
            ) {
                throw new BusinessException(
                    ErrorCode.USER_EMAIL_ALREADY_EXISTS,
                    HttpStatus.CONFLICT,
                    ErrorMessage[ErrorCode.USER_EMAIL_ALREADY_EXISTS],
                );
            }
            throw err;
        }
    }

    async refresh(userId: string, email: string, role: string): Promise<AuthResponseDto> {
        const user = await this.userService.findOneOrFail(userId);

        if (!user.isActive) {
            throw new BusinessException(
                ErrorCode.AUTH_ACCOUNT_LOCKED,
                HttpStatus.FORBIDDEN,
                ErrorMessage[ErrorCode.AUTH_ACCOUNT_LOCKED],
            );
        }

        return this.generateTokens({ sub: userId, email, role });
    }

    async logout(userId: string, refreshToken?: string) {
        if (refreshToken) {
            const decodedRefresh = this.jwtService.decode(refreshToken) as { jti: string; exp: number } | null;
            if (decodedRefresh?.jti && decodedRefresh?.exp) {
                await this.tokenBlacklistRepository.create({
                    jti: decodedRefresh.jti,
                    userId,
                    expiresAt: new Date(decodedRefresh.exp * 1000),
                });
            }
        }
    }

    async changePassword(userId: string, oldPassword: string, newPassword: string) {
        const user = await this.userService.findById(userId);
        if (!user) {
            throw new BusinessException(
                ErrorCode.USER_NOT_FOUND,
                HttpStatus.NOT_FOUND,
                ErrorMessage[ErrorCode.USER_NOT_FOUND]
            );
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            throw new BusinessException(
                ErrorCode.INVALID_OLD_PASSWORD,
                HttpStatus.BAD_REQUEST,
                ErrorMessage[ErrorCode.INVALID_OLD_PASSWORD]
            );
        }

        const newHash = await bcrypt.hash(newPassword, 10);

        await this.userService.changePassword(userId, newHash);
    }

    private generateTokens(payload: { sub: string; email: string; role: string }): AuthResponseDto {
        const accessJti = uuidv4();
        const refreshJti = uuidv4();

        const accessToken = this.jwtService.sign({
            ...payload, jti: accessJti
        }, {
            secret: this.configService.get<string>('jwt.accessSecret'),
            expiresIn: this.configService.get<string>('jwt.accessExpiresIn'),
        });

        const refreshToken = this.jwtService.sign({
            ...payload, jti: refreshJti
        }, {
            secret: this.configService.get<string>('jwt.refreshSecret'),
            expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
        });

        return { accessToken, refreshToken };
    }
}
