import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload } from './jwt.strategy';
import { UserRepository } from '@modules/user/user.repository';
import { TokenBlacklistRepository } from '@modules/auth/token-blacklist.repository';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(
        configService: ConfigService,
        private readonly userRepository: UserRepository,
        private readonly tokenBlacklistRepository: TokenBlacklistRepository,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('jwt.refreshSecret')!,
            passReqToCallback: true,
        });
    }

    async validate(req: Request, payload: JwtPayload) {
        const isBlacklisted = await this.tokenBlacklistRepository.exists(payload.jti);
        if (isBlacklisted) {
            throw new UnauthorizedException('Refresh token đã bị vô hiệu hoá');
        }

        const user = await this.userRepository.findById(payload.sub);
        if (!user || !user.isActive) {
            throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị vô hiệu hoá');
        }

        const tokenIssuedAtMs = payload.iat * 1000;
        if (user.tokenValidAfter && tokenIssuedAtMs < user.tokenValidAfter.getTime()) {
            throw new UnauthorizedException('Token đã hết hiệu lực, vui lòng đăng nhập lại');
        }

        const refreshToken = (req.body as any)?.refreshToken;
        return { ...payload, refreshToken };
    }
}