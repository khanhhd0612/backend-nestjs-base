import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto'
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { JwtService } from '@nestjs/jwt';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly jwtService: JwtService,

    ) { }

    @Public()
    @Post('login')
    @ApiOperation({ summary: 'Đăng nhập bằng email/password, trả về access & refresh token' })
    async login(@Body() dto: LoginDto) {
        const result = await this.authService.login(dto);
        return { message: 'Đăng nhập thành công', data: result };
    }

    @Public()
    @Post('register')
    @ApiOperation({ summary: "Đăng ký tài khoản" })
    async register(@Body() dto: RegisterDto) {
        const result = await this.authService.register(dto);
        return { message: 'Đăng ký thành công', data: result }
    }

    @Public()
    @UseGuards(AuthGuard('jwt-refresh'))
    @Post('refresh')
    @ApiOperation({ summary: 'Cấp lại access/refresh token từ refresh token còn hạn' })
    async refresh(@Body() _dto: RefreshTokenDto, @CurrentUser() user: any) {
        const result = await this.authService.refresh(user.sub, user.email, user.role);
        return { message: 'Làm mới token thành công', data: result };
    }

    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @Post('logout')
    @ApiOperation({ summary: 'Đăng xuất, vô hiệu hoá refresh token' })
    async logout(
        @Body() dto: LogoutDto,
        @CurrentUser() user: any,
    ) {
        await this.authService.logout(user.sub, dto.refreshToken);
        return { message: 'Đăng xuất thành công' };
    }

    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @Post('change-password')
    @ApiOperation({ summary: 'Đổi mật khẩu' })
    async changePassword(
        @Body() dto: ChangePasswordDto,
        @CurrentUser() user: any,
    ) {
        await this.authService.changePassword(
            user.userId,
            dto.oldPassword,
            dto.newPassword,
        );

        return { message: 'Đổi mật khẩu thành công', };
    }
}