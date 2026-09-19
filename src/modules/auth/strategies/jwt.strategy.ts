import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRepository } from '@modules/user/user.repository';
import { TokenBlacklistRepository } from '@modules/auth/token-blacklist.repository';

export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    jti: string;
    iat: number;
    exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        configService: ConfigService,
        private readonly userRepository: UserRepository,
        private readonly tokenBlacklistRepository: TokenBlacklistRepository,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('jwt.accessSecret')!,
        });
    }

    async validate(payload: JwtPayload) {
        //Token đã bị blacklist (logout) chưa
        const isBlacklisted = await this.tokenBlacklistRepository.exists(payload.jti);
        if (isBlacklisted) {
            throw new UnauthorizedException('Token đã bị vô hiệu hoá');
        }

        const user = await this.userRepository.findById(payload.sub);
        if (!user || !user.isActive) {
            throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị vô hiệu hoá');
        }

        //Token phát hành trước mốc tokenValidAfter (đổi mật khẩu/khoá tài khoản) → coi như hết hạn
        const tokenIssuedAtMs = payload.iat * 1000;
        if (user.tokenValidAfter && tokenIssuedAtMs < user.tokenValidAfter.getTime()) {
            throw new UnauthorizedException('Token đã hết hiệu lực, vui lòng đăng nhập lại');
        }

        return { userId: user.id, email: user.email, role: user.role };
    }
}