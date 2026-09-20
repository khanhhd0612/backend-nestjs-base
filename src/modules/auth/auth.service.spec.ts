import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { AuthService } from './auth.service';
import { UserService } from '@modules/user/user.service';
import { TokenBlacklistRepository } from './token-blacklist.repository';
import { SessionRepository } from './session.repository';
import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/constants/error-code.constant';

jest.mock('bcrypt');
jest.mock('@common/utils/device.util', () => ({
    parseDeviceName: jest.fn().mockReturnValue('Chrome trên Windows'),
}));

describe('AuthService', () => {
    let service: AuthService;
    let userService: jest.Mocked<UserService>;
    let jwtService: jest.Mocked<JwtService>;
    let configService: jest.Mocked<ConfigService>;
    let tokenBlacklistRepository: jest.Mocked<TokenBlacklistRepository>;
    let sessionRepository: jest.Mocked<SessionRepository>;

    const mockUser = {
        id: 'user-id-1',
        email: 'user@example.com',
        password: 'hashed-password',
        fullName: 'Nguyễn Văn A',
        role: 'user',
        isActive: true,
        tokenValidAfter: new Date('2026-01-01T00:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: UserService,
                    useValue: {
                        findByEmail: jest.fn(),
                        create: jest.fn(),
                        findOneOrFail: jest.fn(),
                        findById: jest.fn(),
                        changePassword: jest.fn(),
                    },
                },
                {
                    provide: JwtService,
                    useValue: {
                        sign: jest.fn(),
                        decode: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn(),
                    },
                },
                {
                    provide: TokenBlacklistRepository,
                    useValue: {
                        create: jest.fn(),
                        exists: jest.fn(),
                    },
                },
                {
                    provide: SessionRepository,
                    useValue: {
                        create: jest.fn(),
                        findActiveByUser: jest.fn(),
                        findById: jest.fn(),
                        revoke: jest.fn(),
                        revokeAllExcept: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get(AuthService);
        userService = module.get(UserService);
        jwtService = module.get(JwtService);
        configService = module.get(ConfigService);
        tokenBlacklistRepository = module.get(TokenBlacklistRepository);
        sessionRepository = module.get(SessionRepository);

        // Config mặc định dùng chung cho hầu hết test case
        configService.get.mockImplementation((key: string) => {
            const map: Record<string, string> = {
                'jwt.accessSecret': 'access-secret',
                'jwt.accessExpiresIn': '15m',
                'jwt.refreshSecret': 'refresh-secret',
                'jwt.refreshExpiresIn': '7d',
            };
            return map[key];
        });

        jwtService.sign.mockImplementation(
            (payload: any) => `signed.${payload.jti}.token`,
        );
        jwtService.decode.mockImplementation((token: string) => {
            if (typeof token !== 'string') return null;
            const parts = token.split('.');
            // token giả dạng "signed.<jti>.token"
            return { jti: parts[1], exp: Math.floor(Date.now() / 1000) + 3600 };
        });

        jest.clearAllMocks();
        // clearAllMocks ở trên xoá luôn implementation vừa set, set lại cho chắc
        configService.get.mockImplementation((key: string) => {
            const map: Record<string, string> = {
                'jwt.accessSecret': 'access-secret',
                'jwt.accessExpiresIn': '15m',
                'jwt.refreshSecret': 'refresh-secret',
                'jwt.refreshExpiresIn': '7d',
            };
            return map[key];
        });
        jwtService.sign.mockImplementation(
            (payload: any) => `signed.${payload.jti}.token`,
        );
        jwtService.decode.mockImplementation((token: string) => {
            if (typeof token !== 'string') return null;
            const parts = token.split('.');
            return { jti: parts[1], exp: Math.floor(Date.now() / 1000) + 3600 };
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ---------------------------------------------------------------------
    // login
    // ---------------------------------------------------------------------
    describe('login', () => {
        const loginDto = { email: 'user@example.com', password: 'plain-password' };

        it('đăng nhập thành công, trả về accessToken + refreshToken và tạo session', async () => {
            userService.findByEmail.mockResolvedValue(mockUser as any);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await service.login(loginDto as any, {
                userAgent: 'Mozilla/5.0 Chrome',
                ip: '127.0.0.1',
            });

            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
            expect(sessionRepository.create).toHaveBeenCalledTimes(1);
            expect(sessionRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: mockUser.id,
                    userAgent: 'Mozilla/5.0 Chrome',
                    ip: '127.0.0.1',
                }),
            );
        });

        it('throw AUTH_INVALID_CREDENTIALS nếu không tìm thấy user', async () => {
            userService.findByEmail.mockResolvedValue(null);

            await expect(service.login(loginDto as any)).rejects.toMatchObject({
                errorCode: ErrorCode.AUTH_INVALID_CREDENTIALS,
            });
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        it('throw AUTH_INVALID_CREDENTIALS nếu sai mật khẩu', async () => {
            userService.findByEmail.mockResolvedValue(mockUser as any);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(service.login(loginDto as any)).rejects.toMatchObject({
                errorCode: ErrorCode.AUTH_INVALID_CREDENTIALS,
            });
            expect(sessionRepository.create).not.toHaveBeenCalled();
        });

        it('throw AUTH_ACCOUNT_LOCKED nếu tài khoản bị khoá', async () => {
            userService.findByEmail.mockResolvedValue({
                ...mockUser,
                isActive: false,
            } as any);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            await expect(service.login(loginDto as any)).rejects.toMatchObject({
                errorCode: ErrorCode.AUTH_ACCOUNT_LOCKED,
            });
            expect(sessionRepository.create).not.toHaveBeenCalled();
        });
    });

    // ---------------------------------------------------------------------
    // register
    // ---------------------------------------------------------------------
    describe('register', () => {
        const registerDto = {
            email: 'new@example.com',
            password: 'plain-password',
            fullName: 'New User',
        };

        it('đăng ký thành công khi email chưa tồn tại', async () => {
            userService.findByEmail.mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
            userService.create.mockResolvedValue({ id: 'new-id' } as any);

            const result = await service.register(registerDto as any);

            expect(userService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: registerDto.email,
                    password: 'hashed-password',
                    deletedAt: null,
                }),
            );
            expect(result).toEqual({ id: 'new-id' });
        });

        it('throw USER_EMAIL_ALREADY_EXISTS nếu email đã tồn tại (check trước)', async () => {
            userService.findByEmail.mockResolvedValue(mockUser as any);

            await expect(service.register(registerDto as any)).rejects.toMatchObject({
                errorCode: ErrorCode.USER_EMAIL_ALREADY_EXISTS,
            });
            expect(userService.create).not.toHaveBeenCalled();
        });

        it('throw USER_EMAIL_ALREADY_EXISTS nếu insert bị lỗi P2002 (race condition)', async () => {
            userService.findByEmail.mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

            const prismaError = new Prisma.PrismaClientKnownRequestError(
                'Unique constraint failed',
                { code: 'P2002', clientVersion: '5.22.0' } as any,
            );
            userService.create.mockRejectedValue(prismaError);

            await expect(service.register(registerDto as any)).rejects.toMatchObject({
                errorCode: ErrorCode.USER_EMAIL_ALREADY_EXISTS,
            });
        });

        it('ném lại lỗi gốc nếu không phải P2002', async () => {
            userService.findByEmail.mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

            const otherError = new Error('DB down');
            userService.create.mockRejectedValue(otherError);

            await expect(service.register(registerDto as any)).rejects.toThrow('DB down');
        });
    });

    // ---------------------------------------------------------------------
    // refresh
    // ---------------------------------------------------------------------
    describe('refresh', () => {
        it('cấp token mới thành công khi user active', async () => {
            userService.findOneOrFail.mockResolvedValue(mockUser as any);

            const result = await service.refresh(mockUser.id, mockUser.email, mockUser.role);

            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
            expect(sessionRepository.create).toHaveBeenCalledTimes(1);
        });

        it('throw AUTH_ACCOUNT_LOCKED nếu user bị khoá', async () => {
            userService.findOneOrFail.mockResolvedValue({
                ...mockUser,
                isActive: false,
            } as any);

            await expect(
                service.refresh(mockUser.id, mockUser.email, mockUser.role),
            ).rejects.toMatchObject({ errorCode: ErrorCode.AUTH_ACCOUNT_LOCKED });
        });
    });

    // ---------------------------------------------------------------------
    // logout
    // ---------------------------------------------------------------------
    describe('logout', () => {
        it('blacklist đúng jti + exp lấy từ refreshToken được decode', async () => {
            const fakeRefreshToken = 'signed.some-jti-123.token';

            await service.logout(mockUser.id, fakeRefreshToken);

            expect(tokenBlacklistRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    jti: 'some-jti-123',
                    userId: mockUser.id,
                }),
            );
        });

        it('không làm gì nếu không truyền refreshToken', async () => {
            await service.logout(mockUser.id, undefined);

            expect(tokenBlacklistRepository.create).not.toHaveBeenCalled();
        });

        it('không blacklist nếu decode ra payload thiếu jti/exp', async () => {
            jwtService.decode.mockReturnValueOnce({} as any);

            await service.logout(mockUser.id, 'invalid-token');

            expect(tokenBlacklistRepository.create).not.toHaveBeenCalled();
        });
    });

    // ---------------------------------------------------------------------
    // changePassword
    // ---------------------------------------------------------------------
    describe('changePassword', () => {
        it('đổi mật khẩu thành công khi mật khẩu cũ đúng', async () => {
            userService.findById.mockResolvedValue(mockUser as any);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

            await service.changePassword(mockUser.id, 'old-pw', 'new-pw');

            expect(userService.changePassword).toHaveBeenCalledWith(
                mockUser.id,
                'new-hashed-password',
            );
        });

        it('throw USER_NOT_FOUND nếu không tìm thấy user', async () => {
            userService.findById.mockResolvedValue(null);

            await expect(
                service.changePassword(mockUser.id, 'old-pw', 'new-pw'),
            ).rejects.toMatchObject({ errorCode: ErrorCode.USER_NOT_FOUND });
            expect(userService.changePassword).not.toHaveBeenCalled();
        });

        it('throw INVALID_OLD_PASSWORD nếu mật khẩu cũ sai', async () => {
            userService.findById.mockResolvedValue(mockUser as any);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(
                service.changePassword(mockUser.id, 'wrong-old-pw', 'new-pw'),
            ).rejects.toMatchObject({ errorCode: ErrorCode.INVALID_OLD_PASSWORD });
            expect(userService.changePassword).not.toHaveBeenCalled();
        });
    });

    // ---------------------------------------------------------------------
    // getSessions
    // ---------------------------------------------------------------------
    describe('getSessions', () => {
        it('trả về danh sách session đã format, chỉ gồm các field cần thiết', async () => {
            const fakeSessions = [
                {
                    id: 'session-1',
                    userId: mockUser.id,
                    jti: 'jti-1',
                    userAgent: 'Chrome',
                    ip: '1.1.1.1',
                    deviceName: 'Chrome trên Windows',
                    createdAt: new Date('2026-01-01'),
                    lastUsedAt: new Date('2026-01-02'),
                    expiresAt: new Date('2026-01-10'),
                    revokedAt: null,
                },
            ];
            sessionRepository.findActiveByUser.mockResolvedValue(fakeSessions as any);

            const result = await service.getSessions(mockUser.id);

            expect(result).toEqual([
                {
                    id: 'session-1',
                    deviceName: 'Chrome trên Windows',
                    ip: '1.1.1.1',
                    createdAt: fakeSessions[0].createdAt,
                    lastUsedAt: fakeSessions[0].lastUsedAt,
                },
            ]);
        });
    });

    // ---------------------------------------------------------------------
    // revokeSession
    // ---------------------------------------------------------------------
    describe('revokeSession', () => {
        const fakeSession = {
            id: 'session-1',
            userId: mockUser.id,
            jti: 'jti-1',
            expiresAt: new Date('2026-01-10'),
        };

        it('revoke session + blacklist đúng jti khi session thuộc về user', async () => {
            sessionRepository.findById.mockResolvedValue(fakeSession as any);

            await service.revokeSession(mockUser.id, fakeSession.id);

            expect(sessionRepository.revoke).toHaveBeenCalledWith(fakeSession.id);
            expect(tokenBlacklistRepository.create).toHaveBeenCalledWith({
                jti: fakeSession.jti,
                userId: mockUser.id,
                expiresAt: fakeSession.expiresAt,
            });
        });

        it('throw SESSION_NOT_FOUND nếu session không tồn tại', async () => {
            sessionRepository.findById.mockResolvedValue(null);

            await expect(
                service.revokeSession(mockUser.id, 'not-exist'),
            ).rejects.toMatchObject({ errorCode: ErrorCode.SESSION_NOT_FOUND });
            expect(sessionRepository.revoke).not.toHaveBeenCalled();
        });

        it('throw SESSION_NOT_FOUND nếu session thuộc user khác (chống IDOR)', async () => {
            sessionRepository.findById.mockResolvedValue({
                ...fakeSession,
                userId: 'other-user-id',
            } as any);

            await expect(
                service.revokeSession(mockUser.id, fakeSession.id),
            ).rejects.toMatchObject({ errorCode: ErrorCode.SESSION_NOT_FOUND });
            expect(sessionRepository.revoke).not.toHaveBeenCalled();
            expect(tokenBlacklistRepository.create).not.toHaveBeenCalled();
        });
    });

    // ---------------------------------------------------------------------
    // revokeOtherSessions
    // ---------------------------------------------------------------------
    describe('revokeOtherSessions', () => {
        // Mock decode tách chuỗi theo dấu "." -> phải dùng đúng định dạng
        // "signed.<jti>.token" để decode ra đúng currentJti mong muốn.
        const currentRefreshToken = 'signed.current-jti.token';

        it('blacklist tất cả session khác, giữ lại session hiện tại', async () => {
            const sessions = [
                { id: 's1', jti: 'current-jti', expiresAt: new Date('2026-02-01') },
                { id: 's2', jti: 'other-jti-1', expiresAt: new Date('2026-02-02') },
                { id: 's3', jti: 'other-jti-2', expiresAt: new Date('2026-02-03') },
            ];
            sessionRepository.findActiveByUser.mockResolvedValue(sessions as any);

            await service.revokeOtherSessions(mockUser.id, currentRefreshToken);

            expect(jwtService.decode).toHaveBeenCalledWith(currentRefreshToken);
            expect(tokenBlacklistRepository.create).toHaveBeenCalledTimes(2);
            expect(tokenBlacklistRepository.create).toHaveBeenCalledWith({
                jti: 'other-jti-1',
                userId: mockUser.id,
                expiresAt: sessions[1].expiresAt,
            });
            expect(tokenBlacklistRepository.create).toHaveBeenCalledWith({
                jti: 'other-jti-2',
                userId: mockUser.id,
                expiresAt: sessions[2].expiresAt,
            });
            expect(sessionRepository.revokeAllExcept).toHaveBeenCalledWith(
                mockUser.id,
                'current-jti',
            );
        });

        it('không blacklist gì nếu chỉ có 1 session (chính là session hiện tại)', async () => {
            sessionRepository.findActiveByUser.mockResolvedValue([
                { id: 's1', jti: 'current-jti', expiresAt: new Date() },
            ] as any);

            await service.revokeOtherSessions(mockUser.id, currentRefreshToken);

            expect(tokenBlacklistRepository.create).not.toHaveBeenCalled();
            expect(sessionRepository.revokeAllExcept).toHaveBeenCalledWith(
                mockUser.id,
                'current-jti',
            );
        });

        it('throw AUTH_REFRESH_TOKEN_REQUIRED nếu không truyền refreshToken', async () => {
            await expect(
                service.revokeOtherSessions(mockUser.id, undefined),
            ).rejects.toMatchObject({
                errorCode: ErrorCode.AUTH_REFRESH_TOKEN_REQUIRED,
            });

            expect(sessionRepository.findActiveByUser).not.toHaveBeenCalled();
            expect(tokenBlacklistRepository.create).not.toHaveBeenCalled();
            expect(sessionRepository.revokeAllExcept).not.toHaveBeenCalled();
        });
    });
});