import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '@modules/user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh.strategy';
import { TokenBlacklistRepository } from './repositories/token-blacklist.repository';
import { SessionRepository } from './repositories/session.repository';
import { PasswordResetRepository } from './repositories/password-reset.repository';
import { MailService } from '@/shared/mail/mail.service';

@Module({
    imports: [
        UserModule,
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('jwt.accessSecret'),
                signOptions: { expiresIn: config.get<string>('jwt.accessExpiresIn') },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtStrategy,
        RefreshTokenStrategy,
        TokenBlacklistRepository,
        SessionRepository,
        PasswordResetRepository,
        MailService,],
    exports: [AuthService],
})
export class AuthModule { }
