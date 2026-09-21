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
import { TokenBlacklistRepository } from './repositories/token-blacklist.repository';
import { SessionRepository } from './repositories/session.repository';
import { parseDeviceName } from '@common/utils/device.util';
import { generateRawToken, hashToken } from '@common/utils/token-hash.util';
import { MailService } from '@shared/mail/mail.service';
import { PasswordResetRepository } from './repositories/password-reset.repository';

interface DeviceInfo {
    userAgent?: string;
    ip?: string;

}

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly tokenBlacklistRepository: TokenBlacklistRepository,
        private readonly sessionRepository: SessionRepository,
        private readonly passwordResetRepository: PasswordResetRepository,
        private readonly mailService: MailService,
    ) { }

    private readonly RESET_TOKEN_TTL_MINUTES = 15;
    private readonly RESET_RATE_LIMIT_WINDOW_MINUTES = 60;
    private readonly RESET_RATE_LIMIT_MAX_REQUESTS = 3;

    async login(dto: LoginDto, deviceInfo?: DeviceInfo): Promise<AuthResponseDto> {
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

        return this.generateTokens(
            { sub: user.id, email: user.email, role: user.role },
            { userAgent: deviceInfo?.userAgent, ip: deviceInfo?.ip }
        );
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

    private async generateTokens(
        payload: { sub: string; email: string; role: string },
        deviceInfo?: { userAgent?: string; ip?: string },
    ): Promise<AuthResponseDto> {
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

        const decodedRefresh = this.jwtService.decode(refreshToken) as { exp: number };
        await this.sessionRepository.create({
            userId: payload.sub,
            jti: refreshJti,
            userAgent: deviceInfo?.userAgent,
            ip: deviceInfo?.ip,
            deviceName: parseDeviceName(deviceInfo?.userAgent),
            expiresAt: new Date(decodedRefresh.exp * 1000),
        });

        return { accessToken, refreshToken };
    }

    async getSessions(userId: string) {
        const sessions = await this.sessionRepository.findActiveByUser(userId);
        return sessions.map((s) => ({
            id: s.id,
            deviceName: s.deviceName,
            ip: s.ip,
            createdAt: s.createdAt,
            lastUsedAt: s.lastUsedAt,
        }));
    }

    async revokeSession(userId: string, sessionId: string) {
        const session = await this.sessionRepository.findById(sessionId);
        if (!session || session.userId !== userId) {
            throw new BusinessException(
                ErrorCode.SESSION_NOT_FOUND,
                HttpStatus.NOT_FOUND,
                ErrorMessage[ErrorCode.SESSION_NOT_FOUND]
            );
        }

        await this.sessionRepository.revoke(sessionId);
        await this.tokenBlacklistRepository.create({
            jti: session.jti,
            userId,
            expiresAt: session.expiresAt,
        });
    }

    async revokeOtherSessions(userId: string, refreshToken?: string) {
        if (!refreshToken) {
            throw new BusinessException(
                ErrorCode.AUTH_REFRESH_TOKEN_REQUIRED,
                HttpStatus.BAD_REQUEST,
                ErrorMessage[ErrorCode.AUTH_REFRESH_TOKEN_REQUIRED],
            );
        }

        const decodedRefresh = this.jwtService.decode(refreshToken) as { jti: string };
        const currentJti = decodedRefresh.jti

        const sessions = await this.sessionRepository.findActiveByUser(userId);
        const toRevoke = sessions.filter((s) => s.jti !== currentJti);

        for (const s of toRevoke) {
            await this.tokenBlacklistRepository.create({
                jti: s.jti,
                userId,
                expiresAt: s.expiresAt,
            });
        }

        await this.sessionRepository.revokeAllExcept(userId, currentJti);
    }

    async forgotPassword(email: string) {
        const windowStart = new Date(
            Date.now() - this.RESET_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
        );

        const recentCount = await this.passwordResetRepository.countRecentByEmail(
            email,
            windowStart,
        );

        if (recentCount >= this.RESET_RATE_LIMIT_MAX_REQUESTS) {
            throw new BusinessException(
                ErrorCode.PASSWORD_RESET_RATE_LIMITED,
                HttpStatus.TOO_MANY_REQUESTS,
                ErrorMessage[ErrorCode.PASSWORD_RESET_RATE_LIMITED],
            );
        }

        const user = await this.userService.findByEmail(email);
        const rawToken = generateRawToken();
        const tokenHash = hashToken(rawToken);
        const expiresAt = new Date(
            Date.now() + this.RESET_TOKEN_TTL_MINUTES * 60 * 1000,
        );

        await this.passwordResetRepository.create({
            email,
            userId: user?.id ?? null,
            tokenHash,
            expiresAt,
            usedAt: null
        });

        if (user) {
            await this.mailService.sendPasswordResetEmail(user.email, rawToken);
        }

        return {
            message: 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu',
        };
    }

    async resetPassword(token: string, newPassword: string) {
        const tokenHash = hashToken(token);
        const record = await this.passwordResetRepository.findValidByHash(tokenHash);

        if (!record || !record.userId) {
            throw new BusinessException(
                ErrorCode.PASSWORD_RESET_TOKEN_INVALID,
                HttpStatus.BAD_REQUEST,
                ErrorMessage[ErrorCode.PASSWORD_RESET_TOKEN_INVALID],
            );
        }

        const newHash = await bcrypt.hash(newPassword, 10);

        await this.userService.changePassword(record.userId, newHash);

        await this.passwordResetRepository.markUsed(record.id);

        return { message: 'Đặt lại mật khẩu thành công, vui lòng đăng nhập lại' };
    }
}
